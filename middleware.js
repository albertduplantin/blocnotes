import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  // Routes qui nécessitent une authentification
  publicRoutes: ['/', '/notes'],
  ignoredRoutes: ['/api/cleanup'], // Route publique pour le cron
});

export const config = {
  matcher: [
    // Ignorer les fichiers statiques et Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Toujours exécuter pour les routes API
    '/(api|trpc)(.*)',
  ],
};