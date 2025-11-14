import { ClerkProvider } from '@clerk/nextjs';
import './globals.css'; // Assurez-vous de créer ce fichier CSS
import { ThemeProvider } from '../contexts/ThemeContext';

export const metadata = {
  title: 'SecureNotes - Bloc-notes privé',
  description: 'Application de bloc-notes sécurisée et privée',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="fr" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#ffffff" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </head>
        <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}