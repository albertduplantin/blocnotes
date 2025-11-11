import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  // Routes qui nécessitent une authentification
  publicRoutes: [
    '/',
    '/notes',
    '/chat(.*)', // Permet /chat et toutes les sous-routes
    '/manifest.json',
    '/favicon.svg',
    '/icon-192x192.svg',
    '/icon-512x512.svg',
    '/sw.js'
  ],
  ignoredRoutes: ['/api/cleanup', '/api/messages', '/api/pair'], // Routes publiques pour le cron et le chat
});

// Configuration par défaut de Clerk pour éviter les conflits
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};