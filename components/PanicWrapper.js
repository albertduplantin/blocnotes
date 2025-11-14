'use client';

import { useEffect } from 'react';
import { performPanicModeCleanup } from '../utils/cleanupUtils';

export function PanicWrapper({ children }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Détecter Ctrl+Shift+Escape
      if (event.ctrlKey && event.shiftKey && event.key === 'Escape') {
        event.preventDefault();
        triggerPanicMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerPanicMode = async () => {
    try {
      console.log('[PANIC] Mode panique activé - nettoyage immédiat...');

      // Envoyer notification push silencieuse au contact (optionnel)
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification('SecureNotes', {
            body: 'Nouvelle note synchronisée',
            icon: '/icon-192x192.png',
            silent: true,
            vibrate: [100],
            data: {
              type: 'panic',
              timestamp: Date.now(),
              device: navigator.userAgent,
            },
          });
        } catch (notifError) {
          // Ignorer les erreurs de notification
          console.warn('[PANIC] Erreur notification (ignorée):', notifError);
        }
      }

      // Effectuer le nettoyage complet et la redirection
      await performPanicModeCleanup();
    } catch (error) {
      console.error('[PANIC] Erreur lors du mode panique:', error);
      // Rediriger quand même en cas d'erreur
      window.location.replace('/notes?error=sync_failed');
    }
  };

  return <>{children}</>;
}