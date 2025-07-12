import cron from 'node-cron';
import { prisma } from '../index';
import { logger } from '../utils/logger';

export const setupCronJobs = () => {
  // Daily cleanup of old AI interactions (keep last 30 days)
  cron.schedule('0 2 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await prisma.aIInteraction.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info(`Cleaned up ${deletedCount.count} old AI interactions`);
    } catch (error) {
      logger.error('Failed to cleanup AI interactions:', error);
    }
  });

  // Weekly notification cleanup (keep last 90 days)
  cron.schedule('0 3 * * 0', async () => {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deletedCount = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
          isRead: true,
        },
      });

      logger.info(`Cleaned up ${deletedCount.count} old notifications`);
    } catch (error) {
      logger.error('Failed to cleanup notifications:', error);
    }
  });

  // Daily health check
  cron.schedule('0 6 * * *', async () => {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_schools,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_schools,
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_schools_24h
        FROM schools
      `;

      logger.info('Daily health check completed:', stats);
    } catch (error) {
      logger.error('Daily health check failed:', error);
    }
  });

  logger.info('Cron jobs scheduled successfully');
};