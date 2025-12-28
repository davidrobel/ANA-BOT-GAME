import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersupersecret_ana_bot';

router.post('/login', async (req, res) => {
    const { login, password } = req.body;
    console.log(`[Auth] Login attempt for: ${login}`);

    try {
        const user = await prisma.user.findUnique({
            where: { login }
        });

        if (!user) {
            console.log(`[Auth] User not found: ${login}`);
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`[Auth] Invalid password for: ${login}`);
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }

        console.log(`[Auth] Login successful: ${login}`);
        const token = jwt.sign(
            { userId: user.id, login: user.login, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                login: user.login,
                name: user.name,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
});

export default router;
