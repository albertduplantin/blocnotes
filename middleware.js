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

export const config = {
  matcher: [
    // Exclure les fichiers Next.js internes et statiques
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};