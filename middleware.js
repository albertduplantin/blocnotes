import { authMiddleware } from '@clerk/nextjs/server';

// Configuration du middleware avec routes publiques
export default authMiddleware({
  // Routes complètement publiques
  publicRoutes: [
    '/',
    '/notes',
    '/chat-entry',
    '/chat(.*)',
    '/manifest.json',
    '/favicon.svg',
    '/icon-192x192.svg',
    '/icon-512x512.svg',
    '/sw.js',
    '/api/chat(.*)',
    '/api/upload(.*)',
  ],
  // Ne pas rediriger vers sign-in pour ces routes
  ignoredRoutes: [],
});

// Configuration par défaut de Clerk pour éviter les conflits
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};