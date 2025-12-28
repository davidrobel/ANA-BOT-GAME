import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { aiService } from './ai.service';

const prisma = new PrismaClient();

interface GameState {
    gameId: number;
    storyName: string;
    prompt: string;
    solution: string;
    imageUrl?: string | null;
    originChatId?: string; // Where the game started (group)
    isPaused?: boolean;
}

class WhatsAppService {
    private client: Client;
    private qrCode: string | null = null;
    private pairingCode: string | null = null;
    private status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'FAILED' = 'DISCONNECTED';
    private activeGames: Map<string, GameState> = new Map();
    private retryCount: number = 0;
    private maxRetries: number = 5;

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: 'ana-bot' }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
        });

        this.initialize();
    }

    private async initialize() {
        this.client.on('qr', async (qr) => {
            this.qrCode = qr;
            this.pairingCode = null;
            this.status = 'CONNECTING';
            console.log('[WhatsApp] QR Code received');
            qrcode.generate(qr, { small: true });

            await this.updateSession(qr, null, 'CONNECTING');
        });

        this.client.on('authenticated', async () => {
            console.log('[WhatsApp] Authenticated successfully');
            this.status = 'CONNECTING';
            await this.updateSession(null, null, 'CONNECTING');
        });

        this.client.on('ready', async () => {
            this.status = 'CONNECTED';
            this.qrCode = null;
            this.pairingCode = null;
            console.log('[WhatsApp] Client is READY');

            await this.updateSession(null, null, 'CONNECTED');
        });

        this.client.on('disconnected', async (reason) => {
            this.status = 'DISCONNECTED';
            console.log('[WhatsApp] Client disconnected:', reason);

            await this.updateSession(null, null, 'DISCONNECTED');
        });

        this.client.on('auth_failure', async (msg) => {
            console.error('WhatsApp Authentication failure:', msg);
            this.status = 'FAILED';
            await this.updateSession(null, null, 'FAILED');
        });

        this.client.on('message', async (msg) => {
            this.handleMessage(msg);
        });

        this.client.on('group_join', async (notification) => {
            try {
                const chatId = notification.chatId;
                const contact = await this.client.getContactById(notification.recipientIds[0]);
                const name = contact.pushname || 'novo usuário';

                await this.client.sendMessage(chatId, `👋 Olá ${name}! Bem-vindo ao grupo.\n\nSou a Ana Bot e aqui jogamos Black Stories (enigmas sombrios).\n\nUse o comando */ajuda* para ver os comandos disponíveis:\n/start - Iniciar jogo\n/here - Trazer jogo para o grupo\n/ajuda - Ver comandos\n/pause - Pausar jogo\n/sair - Encerrar jogo`);
            } catch (err) {
                console.error('Error in group_join handler:', err);
            }
        });

        this.startClient();
    }

    private async startClient() {
        try {
            console.log('Initializing WhatsApp client...');
            this.status = 'CONNECTING';
            await this.client.initialize();
            console.log('WhatsApp client initialized successfully');
        } catch (err) {
            console.error('Failed to initialize WhatsApp client:', err);
            this.status = 'FAILED';
            await this.updateSession(null, null, 'FAILED');

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying in 10 seconds... (Attempt ${this.retryCount})`);
                setTimeout(() => this.startClient(), 10000);
            }
        }
    }

    private async updateSession(qr: string | null, pairing: string | null, status: string) {
        try {
            await prisma.whatsappSession.upsert({
                where: { id: 1 },
                update: { qrCode: qr, pairingCode: pairing, status },
                create: { id: 1, qrCode: qr, pairingCode: pairing, status }
            });
        } catch (err) {
            console.error('Error updating WhatsApp session in DB:', err);
        }
    }

    public async requestPairingCode(phoneNumber: string) {
        if (this.status === 'CONNECTED') return null;

        try {
            // Ensure client is initialized
            if (this.status === 'DISCONNECTED' || this.status === 'FAILED') {
                await this.startClient();
            }

            console.log(`Requesting pairing code for ${phoneNumber}...`);
            const code = await this.client.requestPairingCode(phoneNumber);
            this.pairingCode = code;
            this.qrCode = null;
            console.log('Pairing Code received:', code);

            await this.updateSession(null, code, 'CONNECTING');
            return code;
        } catch (err) {
            console.error('Error requesting pairing code:', err);
            return null;
        }
    }

    private async handleMessage(msg: any) {
        const text = msg.body.trim().toLowerCase();
        const chatId = msg.from;
        const isGroup = chatId.endsWith('@g.us');

        if (text.startsWith('/start ') && !text.startsWith('/starthere')) {
            await this.handleStartCommand(msg, text, isGroup);
        } else if (text.startsWith('/starthere')) {
            await this.handleStartHereCommand(msg, text);
        } else if (text === '/start') {
            await this.handleListGames(msg);
        } else if (text === '/here' && isGroup) {
            await this.handleHereCommand(msg);
        } else if (text === '/list') {
            await this.handleListGames(msg);
        } else if (text === '/ajuda' || text === '/help') {
            msg.reply('Comandos:\n/start - Inicia um jogo (no privado por padrão)\n/list - Lista os jogos disponíveis\n/here - Move o jogo ativo para este grupo\n/starthere - Inicia um jogo no chat atual\n/ajuda - Mostra esta mensagem\n/pause - Pausa o jogo atual(tudo que for enviado para o jogo sera ignorado)\n/resume - Resume o jogo atual\n/sair - Encerra o jogo');
        } else if (text === '/pause') {
            await this.handlePauseCommand(msg);
        } else if (text === '/resume') {
            await this.handleResumeCommand(msg);
        } else if (text === '/sair' || text === '/stop') {
            if (this.activeGames.has(chatId)) {
                this.activeGames.delete(chatId);
                msg.reply('Jogo encerrado.');
            } else {
                msg.reply('Não há nenhum jogo ativo neste chat.');
            }
        } else if (this.activeGames.has(chatId)) {
            const gameState = this.activeGames.get(chatId);
            if (gameState?.isPaused) {
                // Ignore game input when paused
                return;
            }
            await this.handleGameInteraction(msg);
        }
    }

    private async handleListGames(msg: any) {
        const games = await prisma.game.findMany();
        if (games.length === 0) {
            return msg.reply('Não há jogos cadastrados no momento.');
        }
        let response = 'Escolha um jogo digitando /start [id] ou /starthere [id]:\n\n';
        games.forEach(g => {
            response += `ID ${g.id}: ${g.name}\n`;
        });
        msg.reply(response);
    }

    private async handleStartCommand(msg: any, text: string, isGroup: boolean) {
        const parts = text.split(' ');
        let userIdentifier = msg.from.split('@')[0];

        try {
            const contact = await msg.getContact();
            userIdentifier = contact.pushname || userIdentifier;
        } catch (err) {
            console.error('Error fetching contact in start command:', err);
        }

        const match = text.match(/\/start\s+.*?(\d+)/);
        if (!match) return this.handleListGames(msg);

        const gameId = parseInt(match[1]);
        if (isNaN(gameId)) return this.handleListGames(msg);

        const phone = (msg.author || msg.from).split('@')[0];
        const userWithGames = await prisma.user.findUnique({
            where: { phone },
            include: { playedGames: { where: { gameId } } }
        });

        if (userWithGames && userWithGames.playedGames.length > 0) {
            return msg.reply('🏆 Você já venceu este mistério! Escolha outro jogo em /list.');
        }

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            return msg.reply('Jogo não encontrado.');
        }

        const targetChatId = isGroup ? `${msg.author || msg.from}` : msg.from;

        this.activeGames.set(targetChatId, {
            gameId: game.id,
            storyName: game.name,
            prompt: game.prompt,
            solution: game.solution,
            imageUrl: game.image,
            originChatId: isGroup ? msg.from : undefined,
            isPaused: false
        });

        const startMsg = `🕹 Jogo Iniciado: *${game.name}*\n\n${game.prompt}\n\nInvestigue o mistério fazendo perguntas de Sim ou Não.\n\nQuando achar que resolveu, descreva a solução!`;

        if (isGroup) {
            await this.client.sendMessage(msg.from, `👋 Bem-vindo! O usuário @${userIdentifier} iniciou o jogo: *${game.name}*.\n\nO jogo continuará no chat privado para evitar spoilers! Use /here se quiser jogar no grupo.`);
            await this.sendGameStartMessage(targetChatId, startMsg, game.image);
        } else {
            await this.sendGameStartMessage(targetChatId, startMsg, game.image);
        }
    }

    private async handleStartHereCommand(msg: any, text: string) {
        const match = text.match(/\/starthere\s+.*?(\d+)/);
        if (!match) return this.handleListGames(msg);

        const gameId = parseInt(match[1]);
        if (isNaN(gameId)) return this.handleListGames(msg);

        const phone = (msg.author || msg.from).split('@')[0];
        const userWithGames = await prisma.user.findUnique({
            where: { phone },
            include: { playedGames: { where: { gameId } } }
        });

        if (userWithGames && userWithGames.playedGames.length > 0) {
            return msg.reply('🏆 Você já venceu este mistério! Escolha outro jogo em /list.');
        }

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            return msg.reply('Jogo não encontrado.');
        }

        this.activeGames.set(msg.from, {
            gameId: game.id,
            storyName: game.name,
            prompt: game.prompt,
            solution: game.solution,
            imageUrl: game.image,
            isPaused: false
        });

        const startMsg = `🕹 Jogo Iniciado AQUI: *${game.name}*\n\n${game.prompt}\n\nInvestigue o mistério fazendo perguntas de Sim ou Não.\n\nQuando achar que resolveu, descreva a solução!`;
        await this.sendGameStartMessage(msg.from, startMsg, game.image);
    }

    private async sendGameStartMessage(chatId: string, text: string, imagePath: string | null) {
        if (imagePath) {
            try {
                // If it's a URL, use fromUrl, otherwise load from local file
                let media: MessageMedia;
                if (imagePath.startsWith('http')) {
                    media = await MessageMedia.fromUrl(imagePath);
                } else {
                    const fullPath = path.join(__dirname, '../..', imagePath);
                    if (fs.existsSync(fullPath)) {
                        media = MessageMedia.fromFilePath(fullPath);
                    } else {
                        throw new Error('Image file not found: ' + fullPath);
                    }
                }
                await this.client.sendMessage(chatId, media, { caption: text });
                return;
            } catch (error) {
                console.error('Error sending game image:', error);
            }
        }
        await this.client.sendMessage(chatId, text);
    }

    private async handlePauseCommand(msg: any) {
        const chatId = msg.from;
        const gameState = this.activeGames.get(chatId);

        if (!gameState) {
            return msg.reply('Não há nenhum jogo ativo para pausar.');
        }

        gameState.isPaused = true;
        msg.reply('⏸ Jogo pausado. Todas as mensagens para o jogo serão ignoradas até que você use /resume.');
    }

    private async handleResumeCommand(msg: any) {
        const chatId = msg.from;
        const gameState = this.activeGames.get(chatId);

        if (!gameState) {
            return msg.reply('Não há nenhum jogo ativo para retomar.');
        }

        if (!gameState.isPaused) {
            return msg.reply('O jogo já está em andamento.');
        }

        gameState.isPaused = false;
        msg.reply('▶ Jogo retomado! Pode continuar com as perguntas.');
    }

    private async handleHereCommand(msg: any) {
        const userId = msg.author || msg.from;
        const gameState = this.activeGames.get(userId);

        if (!gameState) {
            return msg.reply('Você não tem um jogo ativo no privado. Use /start [id] primeiro.');
        }

        // Move game to group
        this.activeGames.delete(userId);
        this.activeGames.set(msg.from, {
            ...gameState,
            originChatId: undefined // Now it is happening here
        });

        msg.reply(`🕹 O jogo *${gameState.storyName}* agora está acontecendo AQUI neste grupo!\n\nTodos podem participar perguntando Sim ou Não.`);
    }

    private async handleGameInteraction(msg: any) {
        const chatId = msg.from;
        const gameState = this.activeGames.get(chatId);
        if (!gameState) return;

        try {
            const aiConfig = await prisma.aIConfig.findFirst({ where: { isActive: true } });
            const systemPrompt = aiConfig?.prompt || 'Você é um narrador de Black Stories.';

            const fullSystemPrompt = `${systemPrompt}\n\nO mistério (o que todos sabem) é: "${gameState.prompt}".\nA solução secreta (que só você sabe) é: "${gameState.solution}".\n\nInstruções:\n1. Responda apenas "Sim", "Não" ou "Irrelevante" para perguntas sobre o mistério.\n2. Se o usuário fornecer uma descrição que bata com a solução secreta, responda com "PARABÉNS! VOCÊ RESOLVEU O MISTÉRIO!" e dê uma breve explicação final de como tudo aconteceu.\n3. Seja rigoroso. Não dê dicas extras a menos que seja estritamente necessário para o fluxo do jogo.`;

            const response = await aiService.generateResponse(fullSystemPrompt, msg.body);

            msg.reply(response);

            if (response.includes('PARABÉNS')) {
                this.activeGames.delete(chatId);

                // Track user progress
                const phone = (msg.author || msg.from).split('@')[0];
                let userName = phone;

                try {
                    const contact = await msg.getContact();
                    userName = contact.pushname || phone;
                } catch (err) {
                    console.error('Error fetching contact for progress tracking:', err);
                }

                let user = await prisma.user.findUnique({ where: { phone } });

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            login: `wa_${phone}`,
                            password: 'wa_user_no_login',
                            name: userName,
                            phone: phone
                        }
                    });
                } else {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { level: { increment: 1 } }
                    });
                }

                await prisma.userProgress.create({
                    data: {
                        userId: user.id,
                        gameName: gameState.storyName,
                        won: true
                    }
                });

                // Record to PlayedGame to prevent re-playing
                await prisma.playedGame.upsert({
                    where: {
                        userId_gameId: {
                            userId: user.id,
                            gameId: gameState.gameId
                        }
                    },
                    create: {
                        userId: user.id,
                        gameId: gameState.gameId
                    },
                    update: {} // No update needed
                }).catch(err => console.error('Error recording played game:', err));

                // Notify origin group if exists
                if (gameState.originChatId) {
                    await this.client.sendMessage(gameState.originChatId, `🏆 O usuário @${userName} venceu o jogo *${gameState.storyName}* e subiu de nível!`);
                } else if (chatId.endsWith('@g.us')) {
                    // Game was already in group
                    await this.client.sendMessage(chatId, `🏆 O usuário @${userName} venceu o jogo *${gameState.storyName}* e subiu de nível!`);
                }
            }
        } catch (error: any) {
            console.error('Error in game interaction:', error);
            const errorMessage = error.message.includes('Ollama') || error.message.includes('IA')
                ? `❌ Erro na IA: ${error.message}`
                : 'Ops, tive um probleminha para processar sua mensagem. Tente novamente.';
            msg.reply(errorMessage);
        }
    }

    public getStatus() {
        return {
            status: this.status,
            qrCode: this.qrCode,
            pairingCode: this.pairingCode
        };
    }
}

export const whatsappService = new WhatsAppService();
