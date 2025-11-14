import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

  // Ajouter des headers de sécurité supplémentaires
  afterAuth(auth, req) {
    const response = NextResponse.next();

    // Si c'est une route de chat, ajouter des headers de no-cache
    if (req.nextUrl.pathname.startsWith('/chat')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'no-referrer');
    }

    // Si c'est une API de chat, ajouter des headers de no-cache
    if (req.nextUrl.pathname.startsWith('/api/chat') || req.nextUrl.pathname.startsWith('/api/messages')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }

    return response;
  },
});

// Configuration par défaut de Clerk pour éviter les conflits
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};