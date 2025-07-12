import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { UserRole, SchoolStatus, SubscriptionPlan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(requireSuperAdmin);

// Get admin dashboard stats
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalSchools,
      activeSchools,
      totalUsers,
      totalStudents,
      recentSchools,
      recentUsers
    ] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { status: SchoolStatus.ACTIVE } }),
      prisma.user.count({ where: { role: { not: UserRole.SUPER_ADMIN } } }),
      prisma.student.count(),
      prisma.school.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        take: 5,
        where: { role: { not: UserRole.SUPER_ADMIN } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      stats: {
        totalSchools,
        activeSchools,
        totalUsers,
        totalStudents,
      },
      recentSchools,
      recentUsers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get all schools
router.get('/schools', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              students: true,
            },
          },
        },
      }),
      prisma.school.count({ where }),
    ]);

    res.json({
      schools,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// Create new school
router.post('/schools', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      adminFullName,
      adminEmail,
      adminPassword,
      subscriptionPlan = SubscriptionPlan.BASIC,
      academicYear,
    } = req.body;

    if (!name || !email || !adminFullName || !adminEmail || !adminPassword) {
      throw createError('Missing required fields', 400);
    }

    // Check if school email already exists
    const existingSchool = await prisma.school.findUnique({
      where: { email },
    });

    if (existingSchool) {
      throw createError('School with this email already exists', 400);
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      throw createError('Admin user with this email already exists', 400);
    }

    // Create school and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create school
      const school = await tx.school.create({
        data: {
          name,
          email,
          phone,
          address,
          subscriptionPlan,
          academicYear,
        },
      });

      // Create admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          fullName: adminFullName,
          role: UserRole.SCHOOL_ADMIN,
          schoolId: school.id,
        },
      });

      // Update school with admin user ID
      await tx.school.update({
        where: { id: school.id },
        data: { admin_user_id: adminUser.id },
      });

      return { school, adminUser };
    });

    res.status(201).json({
      message: 'School created successfully',
      school: result.school,
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        fullName: result.adminUser.fullName,
        role: result.adminUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Update school
router.put('/schools/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, status, subscriptionPlan, academicYear } = req.body;

    const school = await prisma.school.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        status,
        subscriptionPlan,
        academicYear,
      },
    });

    res.json({ message: 'School updated successfully', school });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// Delete school
router.delete('/schools/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.school.delete({
      where: { id },
    });

    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, role, schoolId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      role: { not: UserRole.SUPER_ADMIN },
    };

    if (search) {
      where.OR = [
        { fullName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }
    if (schoolId) {
      where.schoolId = schoolId;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
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

export default router;