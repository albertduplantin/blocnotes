'use client';

import { useEffect } from 'react';

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
      // Effacer localStorage
      localStorage.clear();

      // Effacer IndexedDB
      indexedDB.deleteDatabase('chat');

      // Envoyer notification push silencieuse au contact
      if ('serviceWorker' in navigator && 'Notification' in window) {
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
      }

      // Rediriger vers /notes avec message d'erreur factice
      window.location.href = '/notes?error=sync_failed';
    } catch (error) {
      console.error('Erreur lors du mode panique:', error);
      window.location.href = '/notes?error=sync_failed';
    }
  };

  return <>{children}</>;
}