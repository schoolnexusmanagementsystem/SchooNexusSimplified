import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Apply auth middleware to all user routes
router.use(authMiddleware);

// Get user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        school: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fullName, phone, address, emergencyContact, preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        profile: {
          upsert: {
            create: {
              phone,
              address,
              emergencyContact,
              preferences,
            },
            update: {
              phone,
              address,
              emergencyContact,
              preferences,
            },
          },
        },
      },
      include: {
        profile: true,
      },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get notifications
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    res.json({
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;