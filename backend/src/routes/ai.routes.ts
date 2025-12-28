import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all AI configs
router.get('/', async (req, res) => {
    try {
        const configs = await prisma.aIConfig.findMany();
        res.json(configs);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configuraÃ§Ãµes' });
    }
});

// Update or create AI config
router.post('/', async (req, res) => {
    const { provider, apiKey, baseUrl, prompt, model, isActive } = req.body;
    console.log(`[AI Config] Saving for provider: ${provider}`, { model, isActive, baseUrl });

    try {
        const config = await prisma.aIConfig.upsert({
            where: { provider },
            update: {
                apiKey: apiKey !== undefined ? apiKey : undefined,
                baseUrl: baseUrl !== undefined ? baseUrl : undefined,
                prompt: prompt !== undefined ? prompt : undefined,
                model: model !== undefined ? model : undefined,
                isActive
            },
            create: { provider, apiKey, baseUrl, prompt, model, isActive }
        });
        console.log(`[AI Config] Successfully saved: ${provider}`);
        res.json(config);
    } catch (error) {
        console.error('[AI Config] Error saving config:', error);
        res.status(500).json({ message: 'Erro ao salvar configuração' });
    }
});

export default router;
