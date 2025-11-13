import { z } from 'zod';
import { APP_CONFIG } from './constants';

// Message validation schemas
export const createMessageSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1, 'Le message ne peut pas être vide').max(10000, 'Message trop long'),
  imageUrl: z.string().url('URL invalide').optional().nullable(),
  timestamp: z.string().datetime().optional(),
  sentByAdmin: z.boolean().optional().default(false),
});

export const getMessagesSchema = z.object({
  since: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(APP_CONFIG.MESSAGES_PER_PAGE),
});

// Room/Conversation validation schemas
export const createRoomSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  password: z.string().min(3, 'Le mot de passe doit contenir au moins 3 caractères').optional(),
});

export const updateRoomPasswordSchema = z.object({
  accessPassword: z.string().min(3, 'Le mot de passe doit contenir au moins 3 caractères').max(255, 'Mot de passe trop long'),
});

export const roomIdSchema = z.object({
  roomId: z.string().min(1, 'Room ID requis').regex(/^[A-Z0-9]+$/, 'Room ID invalide'),
});

// Authentication validation schemas
export const loginSchema = z.object({
  roomId: z.string().min(1, 'Code de conversation requis'),
  password: z.string().optional(),
  isAdmin: z.boolean().optional().default(false),
});

export const verifyAccessPasswordSchema = z.object({
  roomId: z.string().min(1, 'Room ID requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= APP_CONFIG.MAX_FILE_SIZE_BYTES,
    `La taille du fichier ne doit pas dépasser ${APP_CONFIG.MAX_FILE_SIZE_MB}MB`
  ).refine(
    (file) => APP_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type as any),
    'Type de fichier non supporté. Formats acceptés: JPEG, PNG, GIF, WebP'
  ),
});

// Note validation schemas
export const noteSchema = z.object({
  id: z.number().optional(),
  title: z.string().max(200, 'Titre trop long'),
  content: z.string().max(50000, 'Contenu trop long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide'),
  createdAt: z.string().datetime().optional(),
});

// Generic ID validation
export const idSchema = z.object({
  id: z.string().min(1, 'ID requis'),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Query parameter helpers
export const booleanQueryParam = z
  .string()
  .optional()
  .transform((val) => val === 'true');

export const numberQueryParam = z
  .string()
  .optional()
  .transform((val) => (val ? parseInt(val, 10) : undefined));

// Type exports for use in components
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomPasswordInput = z.infer<typeof updateRoomPasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
