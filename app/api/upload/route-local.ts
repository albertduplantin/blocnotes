import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { nanoid } from 'nanoid';
import { rateLimit, addRateLimitHeaders } from '@/lib/middleware/rateLimit';
import { errorResponse, successResponse, withErrorHandling } from '@/lib/utils';
import { HTTP_STATUS, ERROR_MESSAGES, APP_CONFIG } from '@/lib/constants';

/**
 * POST /api/upload - Upload image locally (dev only)
 * NOTE: For production, use Vercel Blob or other cloud storage
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  // Check if we're in development
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse(
      'Le stockage local est uniquement disponible en développement',
      HTTP_STATUS.FORBIDDEN
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse('Aucun fichier fourni', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate file type
    if (!APP_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      return errorResponse(ERROR_MESSAGES.INVALID_FILE_TYPE, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate file size
    if (file.size > APP_CONFIG.MAX_FILE_SIZE_BYTES) {
      return errorResponse(ERROR_MESSAGES.FILE_TOO_LARGE, HTTP_STATUS.BAD_REQUEST);
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${nanoid()}.${ext}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filepath = join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/${filename}`;

    const response = successResponse(
      { url },
      'Image uploadée avec succès',
      HTTP_STATUS.CREATED
    );

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error uploading file:', error);
    return errorResponse(ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.INTERNAL_ERROR);
  }
});
