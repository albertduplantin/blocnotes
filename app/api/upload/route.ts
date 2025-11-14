import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

/**
 * Image upload with automatic compression and validation
 * Compresses images to reduce storage costs and improve performance
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1920; // Max width in pixels
const MAX_HEIGHT = 1080; // Max height in pixels
const QUALITY = 80; // JPEG/WebP quality (0-100)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `L'image ne doit pas dépasser ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with sharp
    let processedImage = sharp(buffer);

    // Get image metadata
    const metadata = await processedImage.metadata();

    // Resize if image is too large
    if (metadata.width && metadata.width > MAX_WIDTH || metadata.height && metadata.height > MAX_HEIGHT) {
      processedImage = processedImage.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Compress based on format
    let compressedBuffer: Buffer;
    let contentType: string;
    let extension: string;

    if (file.type === 'image/png') {
      // Convert PNG to WebP for better compression
      compressedBuffer = await processedImage
        .webp({ quality: QUALITY })
        .toBuffer();
      contentType = 'image/webp';
      extension = 'webp';
    } else if (file.type === 'image/gif') {
      // Keep GIF as is (animated GIFs)
      compressedBuffer = buffer;
      contentType = 'image/gif';
      extension = 'gif';
    } else {
      // JPEG/WebP compression
      compressedBuffer = await processedImage
        .jpeg({ quality: QUALITY, progressive: true })
        .toBuffer();
      contentType = 'image/jpeg';
      extension = 'jpg';
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `chat-${timestamp}-${randomId}.${extension}`;

    console.log(`[Upload] Original: ${(file.size / 1024).toFixed(2)}KB -> Compressed: ${(compressedBuffer.length / 1024).toFixed(2)}KB`);

    // Upload to Vercel Blob
    const blob = await put(filename, compressedBuffer, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      originalSize: file.size,
      compressedSize: compressedBuffer.length,
      reduction: `${(((file.size - compressedBuffer.length) / file.size) * 100).toFixed(1)}%`
    });
  } catch (error) {
    console.error('[API POST /api/upload] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'image' },
      { status: 500 }
    );
  }
}
