// Stores partagés entre les différentes routes API
// Utiliser global pour persister entre les requêtes (en développement et production)

// Store des messages par conversation
if (!global.messagesStore) {
  global.messagesStore = new Map();
}

// Store des mots de passe d'accès par conversation
if (!global.passwordsStore) {
  global.passwordsStore = new Map();
}

export const messagesStore = global.messagesStore;
export const passwordsStore = global.passwordsStore;
