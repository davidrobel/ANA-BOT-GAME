import OpenAI from 'openai';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class AIService {
    private async getActiveConfig() {
        return await prisma.aIConfig.findFirst({
            where: { isActive: true }
        });
    }

    public async generateResponse(systemPrompt: string, userMessage: string): Promise<string> {
        const config = await this.getActiveConfig();

        if (!config) {
            throw new Error('Nenhuma configuração de IA ativa encontrada.');
        }

        if (config.provider === 'chatgpt') {
            return await this.generateOpenAIResponse(config, systemPrompt, userMessage);
        } else if (config.provider === 'ollama') {
            return await this.generateOllamaResponse(config, systemPrompt, userMessage);
        } else {
            throw new Error('Provedor de IA desconhecido.');
        }
    }

    private async generateOpenAIResponse(config: any, systemPrompt: string, userMessage: string): Promise<string> {
        const openai = new OpenAI({
            apiKey: config.apiKey || '',
        });

        const response = await openai.chat.completions.create({
            model: config.model || 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
        });

        return response.choices[0].message.content || 'Sem resposta da IA.';
    }

    private async generateOllamaResponse(config: any, systemPrompt: string, userMessage: string): Promise<string> {
        let baseUrl = config.baseUrl || 'http://localhost:11434';
        // Normalize URL: remove trailing slash
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        const model = config.model || 'llama3';

        try {
            console.log(`[AI] Calling Ollama at ${baseUrl}/api/chat with model ${model}`);
            const response = await axios.post(`${baseUrl}/api/chat`, {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                stream: false
            });

            return response.data.message.content;
        } catch (error: any) {
            if (error.response) {
                console.error(`[AI] Ollama Error (${error.response.status}):`, error.response.data);
                if (error.response.status === 404) {
                    throw new Error(`Ollama: Modelo "${model}" não encontrado. Certifique-se de rodar "ollama pull ${model}" no seu servidor.`);
                }
            } else {
                console.error('[AI] Ollama connection error:', error.message);
            }
            throw new Error('Falha ao comunicar com Ollama.');
        }
    }
}

export const aiService = new AIService();
