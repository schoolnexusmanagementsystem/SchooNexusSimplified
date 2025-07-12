import { Router } from 'express';
import authRoutes from './auth';
import adminRoutes from './admin';
import schoolRoutes from './school';
import aiRoutes from './ai';
import documentRoutes from './documents';
import botRoutes from './bots';
import userRoutes from './users';

export const setupRoutes = () => {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // API routes
  router.use('/auth', authRoutes);
  router.use('/admin', adminRoutes);
  router.use('/school', schoolRoutes);
  router.use('/ai', aiRoutes);
  router.use('/documents', documentRoutes);
  router.use('/bots', botRoutes);
  router.use('/users', userRoutes);

  return router;
};