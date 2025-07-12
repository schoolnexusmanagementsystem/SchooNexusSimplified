import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw createError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        schoolId: user.schoolId,
      },
      process.env.JWT_SECRET || 'school-nexus-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.json({
      accessToken: token,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        schoolId: user.schoolId,
        school: user.school,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            status: true,
            logoUrl: true,
          },
        },
        profile: true,
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolId: user.schoolId,
      school: user.school,
      profile: user.profile,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;