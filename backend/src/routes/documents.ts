import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { DocumentType } from '@prisma/client';
import Handlebars from 'handlebars';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const router = Router();

// Apply auth middleware to all document routes
router.use(authMiddleware);

// Get document templates
router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const templates = await prisma.document.findMany({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create document template
router.post('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    if (!schoolId) {
      throw createError('School not found', 404);
    }

    const { type, title, content, variables } = req.body;

    if (!type || !title || !content) {
      throw createError('Type, title, and content are required', 400);
    }

    const template = await prisma.document.create({
      data: {
        schoolId,
        type: type as DocumentType,
        title,
        content,
        variables,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Generate document
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const { templateId, variables } = req.body;

    if (!templateId) {
      throw createError('Template ID is required', 400);
    }

    const template = await prisma.document.findFirst({
      where: { id: templateId, schoolId, isActive: true },
    });

    if (!template) {
      throw createError('Template not found', 404);
    }

    // Compile template with variables
    const compiledTemplate = Handlebars.compile(template.content);
    const generatedContent = compiledTemplate(variables || {});

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    let y = height - 50;

    // Split content into lines
    const lines = generatedContent.split('\n');
    
    for (const line of lines) {
      if (y < 50) {
        page = pdfDoc.addPage();
        y = height - 50;
      }
      
      page.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template.title}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

export default router;