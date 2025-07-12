import { Server } from 'socket.io';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';

export const setupSocketIO = (io: Server) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const secret = process.env.JWT_SECRET || 'school-nexus-secret-key-2024';
      const decoded = jwt.verify(token, secret) as {
        userId: string;
        role: string;
        schoolId?: string;
      };

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
        return next(new Error('User not found or inactive'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`User ${user.email} connected`);

    // Join school-specific room
    if (user.schoolId) {
      socket.join(`school:${user.schoolId}`);
    }

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Handle AI chat messages
    socket.on('ai:chat', async (data) => {
      try {
        // Process AI chat (similar to REST endpoint)
        // This could trigger real-time AI responses
        socket.emit('ai:response', {
          message: 'AI response placeholder',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to process AI request' });
      }
    });

    // Handle notifications
    socket.on('notifications:subscribe', () => {
      // Subscribe to real-time notifications
      socket.join(`notifications:${user.id}`);
    });

    // Handle document generation
    socket.on('document:generate', async (data) => {
      try {
        // Process document generation
        socket.emit('document:progress', { progress: 50 });
        
        // Simulate document generation
        setTimeout(() => {
          socket.emit('document:complete', {
            url: '/api/documents/download/123',
            filename: 'generated-document.pdf',
          });
        }, 2000);
      } catch (error) {
        socket.emit('error', { message: 'Failed to generate document' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${user.email} disconnected`);
    });
  });

  return io;
};