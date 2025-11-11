import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Définir les routes qui nécessitent une authentification
const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/api/(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // Protéger les routes définies
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Ignorer les fichiers statiques et Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Toujours exécuter pour les routes API
    '/(api|trpc)(.*)',
  ],
};