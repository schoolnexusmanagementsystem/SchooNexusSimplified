import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { UserRole } from '@prisma/client';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    schoolId?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Access token required', 401);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'school-nexus-secret-key-2024';
    
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      role: UserRole;
      schoolId?: string;
    };

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireSuperAdmin = requireRole([UserRole.SUPER_ADMIN]);
export const requireSchoolAdmin = requireRole([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]);
export const requireStaff = requireRole([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.STAFF]);