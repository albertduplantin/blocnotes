import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  // Routes qui nécessitent une authentification
  publicRoutes: [
    '/',
    '/notes',
    '/manifest.json',
    '/favicon.svg',
    '/icon-192x192.svg',
    '/icon-512x512.svg',
    '/sw.js'
  ],
  ignoredRoutes: ['/api/cleanup'], // Route publique pour le cron
});

// Configuration par défaut de Clerk pour éviter les conflits
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};