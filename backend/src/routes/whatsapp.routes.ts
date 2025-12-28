import { Router } from 'express';
import { whatsappService } from '../services/whatsapp.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/status', async (req, res) => {
    try {
        const session = await prisma.whatsappSession.findUnique({ where: { id: 1 } });
        if (!session) {
            return res.json({ status: 'DISCONNECTED', qrCode: null, pairingCode: null });
        }
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar status do WhatsApp' });
    }
});

router.post('/request-pairing', async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: 'Telefone é obrigatório' });
    }

    try {
        const code = await whatsappService.requestPairingCode(phone);
        if (code) {
            res.json({ pairingCode: code });
        } else {
            res.status(500).json({ message: 'Erro ao gerar código de pareamento' });
        }
    } catch (error) {
        console.error('Error in request-pairing route:', error);
        res.status(500).json({ message: 'Erro interno ao solicitar pareamento' });
    }
});

export default router;
