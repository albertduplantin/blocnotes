'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier si un chat existe dans IndexedDB
    const checkChatExistence = async () => {
      try {
        const db = await openDB('chat', 1);
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          if (countRequest.result > 0) {
            router.push('/chat');
          } else {
            router.push('/notes');
          }
        };
      } catch (error) {
        console.error('Erreur lors de la vérification du chat:', error);
        router.push('/notes');
      }
    };

    checkChatExistence();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">SecureNotes</h1>
        <p>Chargement...</p>
      </div>
    </div>
  );
}

// Fonction utilitaire pour ouvrir IndexedDB
function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'id' });
      }
    };
  });
}