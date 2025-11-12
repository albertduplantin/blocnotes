import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  // Routes qui nécessitent une authentification
  publicRoutes: [
    '/',
    '/notes',
    '/chat-entry', // Page d'entrée pour le chat secret
    '/chat(.*)', // Permet /chat et toutes les sous-routes
    '/api/chat/(.*)', // Permet l'API chat pour la synchronisation
    '/manifest.json',
    '/favicon.svg',
    '/icon-192x192.svg',
    '/icon-512x512.svg',
    '/sw.js'
  ],
  ignoredRoutes: ['/api/cleanup', '/api/messages', '/api/pair'], // Routes publiques pour le cron
});

// Configuration par défaut de Clerk pour éviter les conflits
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};