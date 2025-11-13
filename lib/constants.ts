// Application constants
export const APP_CONFIG = {
  // Polling & Real-time
  POLLING_INTERVAL_MS: 3000,
  MESSAGE_RETENTION_HOURS: 24,
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes

  // File upload
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  // Pagination
  MESSAGES_PER_PAGE: 50,
  NOTES_PER_PAGE: 20,

  // Security
  JWT_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: 12,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Room ID
  ROOM_ID_LENGTH: 8,

  // Panic mode
  PANIC_KEY_COMBO: ['Control', 'Shift', 'Escape'],
} as const;

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Non autorisé',
  FORBIDDEN: 'Accès interdit',
  MISSING_DATA: 'Données manquantes',
  INVALID_DATA: 'Données invalides',
  SERVER_ERROR: 'Erreur serveur',
  NOT_FOUND: 'Ressource non trouvée',
  RATE_LIMIT_EXCEEDED: 'Trop de requêtes, veuillez réessayer plus tard',
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier non supporté',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PASSWORD_SAVED: 'Mot de passe enregistré',
  MESSAGE_SENT: 'Message envoyé',
  MESSAGE_DELETED: 'Message supprimé',
  NOTE_SAVED: 'Note sauvegardée',
  NOTE_DELETED: 'Note supprimée',
} as const;
