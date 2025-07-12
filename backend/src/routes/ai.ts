import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AIResponseType } from '@prisma/client';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Apply auth middleware to all AI routes
router.use(authMiddleware);

// AI Chat endpoint
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { query, responseType = 'TEXT' } = req.body;
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId;

    if (!query) {
      throw createError('Query is required', 400);
    }

    // Get school context
    let schoolContext = '';
    if (schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, academicYear: true },
      });
      schoolContext = `You are an AI assistant for ${school?.name || 'a school'}. `;
    }

    // Get user's recent interactions for context
    const recentInteractions = await prisma.aIInteraction.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { query: true, response: true },
    });

    const conversationHistory = recentInteractions
      .reverse()
      .map(interaction => `User: ${interaction.query}\nAssistant: ${interaction.response}`)
      .join('\n\n');

    // Build system prompt
    const systemPrompt = `${schoolContext}You are a helpful AI assistant for a school management system. You can help with:
- Student information and records
- Staff information and schedules
- Academic data and grades
- School policies and procedures
- General school management questions

Please provide accurate, helpful responses based on the available data. If you don't have access to specific information, let the user know and suggest how they might find it.

Current conversation context:
${conversationHistory}`;

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Save interaction
    await prisma.aIInteraction.create({
      data: {
        userId,
        schoolId: schoolId || '',
        query,
        response: aiResponse,
        responseType: responseType as AIResponseType,
        metadata: {
          model: 'gpt-4',
          tokens: completion.usage?.total_tokens,
        },
      },
    });

    res.json({
      response: aiResponse,
      responseType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// Get AI interaction history
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [interactions, total] = await Promise.all([
      prisma.aIInteraction.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          query: true,
          response: true,
          responseType: true,
          createdAt: true,
        },
      }),
      prisma.aIInteraction.count({ where: { userId } }),
    ]);

    res.json({
      interactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI history' });
  }
});

// Voice-to-text endpoint
router.post('/voice-to-text', async (req: AuthRequest, res: Response) => {
  try {
    const { audioData } = req.body;

    if (!audioData) {
      throw createError('Audio data is required', 400);
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Use OpenAI Whisper for speech-to-text
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer as any,
      model: "whisper-1",
    });

    res.json({
      text: transcription.text,
    });
  } catch (error) {
    console.error('Voice-to-text error:', error);
    res.status(500).json({ error: 'Failed to process voice input' });
  }
});

export default router;