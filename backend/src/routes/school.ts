import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, requireSchoolAdmin, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

// Apply auth middleware to all school routes
router.use(authMiddleware);
router.use(requireSchoolAdmin);

// Get school dashboard stats
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const [
      totalStudents,
      totalStaff,
      totalClasses,
      recentStudents,
      recentStaff
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.staff.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.student.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.staff.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    res.json({
      stats: {
        totalStudents,
        totalStaff,
        totalClasses,
      },
      recentStudents,
      recentStaff,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get school info
router.get('/info', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw createError('School not found', 404);
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get school info' });
  }
});

// Get school users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const { page = 1, limit = 10, search, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { schoolId };
    if (search) {
      where.OR = [
        { fullName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create new user
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const {
      email,
      password,
      fullName,
      role,
      phone,
      address,
    } = req.body;

    if (!email || !password || !fullName || !role) {
      throw createError('Missing required fields', 400);
    }

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        role,
        schoolId,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get students
router.get('/students', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const { page = 1, limit = 10, search, grade } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { schoolId };
    if (search) {
      where.OR = [
        { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
        { studentId: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (grade) {
      where.grade = grade;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      students,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get students' });
  }
});

// Get staff
router.get('/staff', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const { page = 1, limit = 10, search, department } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { schoolId };
    if (search) {
      where.OR = [
        { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
        { staffId: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (department) {
      where.department = department;
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.staff.count({ where }),
    ]);

    res.json({
      staff,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get staff' });
  }
});

export default router;