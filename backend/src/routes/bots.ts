import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { BotPlatform } from '@prisma/client';

const router = Router();

// Apply auth middleware to all bot routes
router.use(authMiddleware);

// Get bot configurations
router.get('/configs', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const configs = await prisma.botConfig.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bot configs' });
  }
});

// Create bot configuration
router.post('/configs', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const { platform, token, webhookUrl, settings } = req.body;

    if (!platform || !token) {
      throw createError('Platform and token are required', 400);
    }

    // Check if config already exists for this platform
    const existingConfig = await prisma.botConfig.findFirst({
      where: { schoolId, platform: platform as BotPlatform },
    });

    if (existingConfig) {
      throw createError(`Bot config for ${platform} already exists`, 400);
    }

    const config = await prisma.botConfig.create({
      data: {
        schoolId,
        platform: platform as BotPlatform,
        token,
        webhookUrl,
        settings,
      },
    });

    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bot config' });
  }
});

// Update bot configuration
router.put('/configs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    const { token, webhookUrl, settings, isActive } = req.body;

    const config = await prisma.botConfig.update({
      where: { id, schoolId },
      data: {
        token,
        webhookUrl,
        settings,
        isActive,
      },
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bot config' });
  }
});

// Delete bot configuration
router.delete('/configs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    await prisma.botConfig.delete({
      where: { id, schoolId },
    });

    res.json({ message: 'Bot config deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bot config' });
  }
});

export default router;