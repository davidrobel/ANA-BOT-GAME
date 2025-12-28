import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Get all games
router.get('/', async (req, res) => {
    try {
        const games = await prisma.game.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar jogos' });
    }
});

// Create game
router.post('/', upload.single('image'), async (req, res) => {
    const { name, prompt, solution } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image;

    try {
        const game = await prisma.game.create({
            data: {
                name,
                prompt,
                solution: solution || '', // Ensure solution is saved
                image: imageUrl
            }
        });
        res.json(game);
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ message: 'Erro ao criar jogo' });
    }
});

// Update game
router.put('/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, prompt, solution } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image;

    try {
        const game = await prisma.game.update({
            where: { id: parseInt(id) },
            data: {
                name,
                prompt,
                solution,
                image: imageUrl
            }
        });
        res.json(game);
    } catch (error) {
        console.error('Error updating game:', error);
        res.status(500).json({ message: 'Erro ao atualizar jogo' });
    }
});

// Delete game
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Optionially delete image file here
        await prisma.game.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Jogo deletado' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar jogo' });
    }
});

export default router;
