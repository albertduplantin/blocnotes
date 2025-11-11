import { ClerkProvider } from '@clerk/nextjs';
import './globals.css'; // Assurez-vous de créer ce fichier CSS

export const metadata = {
  title: 'SecureNotes - Bloc-notes privé',
  description: 'Application de bloc-notes sécurisée et privée',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png', // Icône à créer
  },
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#ffffff" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}