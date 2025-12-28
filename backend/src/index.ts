import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/auth.routes';
import aiRoutes from './routes/ai.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import userRoutes from './routes/user.routes';
import gameRoutes from './routes/game.routes';
import { whatsappService } from './services/whatsapp.service';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging for debug
app.use((req, res, next) => {
    console.log(`[Backend] ${req.method} ${req.url}`);
    next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Seed initial data
    try {
        // Admin user - Force reset for external login troubleshooting
        const admin = await prisma.user.findUnique({ where: { login: 'admin' } });
        const hashedAdminPassword = await bcrypt.hash('admin', 10);

        if (!admin) {
            await prisma.user.create({
                data: {
                    login: 'admin',
                    password: hashedAdminPassword,
                    isAdmin: true,
                    name: 'Administrator'
                }
            });
            console.log('✅ Admin user "admin" created successfully');
        } else {
            // Force password update to be sure it is 'admin'
            await prisma.user.update({
                where: { login: 'admin' },
                data: { password: hashedAdminPassword }
            });
            console.log('ℹ️ Admin user "admin" updated (password reset to "admin")');
        }

        // Default AI configs
        const gpt = await prisma.aIConfig.findUnique({ where: { provider: 'chatgpt' } });
        if (!gpt) {
            await prisma.aIConfig.create({
                data: {
                    provider: 'chatgpt',
                    model: 'gpt-4o',
                    isActive: false,
                    prompt: 'Você é um narrador de jogos de mistério Black Stories. Sua tarefa é conduzir o jogo...'
                }
            });
        }

        const ollama = await prisma.aIConfig.findUnique({ where: { provider: 'ollama' } });
        if (!ollama) {
            await prisma.aIConfig.create({
                data: {
                    provider: 'ollama',
                    baseUrl: 'http://localhost:11434',
                    model: 'llama3',
                    isActive: false,
                    prompt: 'Você é um narrador de jogos de mistério Black Stories...'
                }
            });
        }

    } catch (error) {
        console.error('Error during seeding:', error);
    }
});

export { prisma };
