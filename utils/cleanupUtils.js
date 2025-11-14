/**
 * Utilitaires pour nettoyer TOUTES les traces de l'application
 * Garantit qu'aucune donnée sensible ne reste dans le navigateur
 */

/**
 * Efface tous les caches du Service Worker
 */
export const clearServiceWorkerCaches = async () => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[Cleanup] Service Worker caches effacés');
    }
  } catch (error) {
    console.error('[Cleanup] Erreur lors de l\'effacement des caches:', error);
  }
};

/**
 * Désenregistre tous les Service Workers
 */
export const unregisterServiceWorkers = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('[Cleanup] Service Workers désenregistrés');
    }
  } catch (error) {
    console.error('[Cleanup] Erreur lors du désenregistrement des SW:', error);
  }
};

/**
 * Efface complètement localStorage
 */
export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    console.log('[Cleanup] localStorage effacé');
  } catch (error) {
    console.error('[Cleanup] Erreur lors de l\'effacement du localStorage:', error);
  }
};

/**
 * Efface complètement sessionStorage
 */
export const clearSessionStorage = () => {
  try {
    sessionStorage.clear();
    console.log('[Cleanup] sessionStorage effacé');
  } catch (error) {
    console.error('[Cleanup] Erreur lors de l\'effacement du sessionStorage:', error);
  }
};

/**
 * Efface toutes les bases de données IndexedDB
 */
export const clearIndexedDB = async () => {
  try {
    if ('indexedDB' in window) {
      // Méthode 1: Effacer les bases connues
      const knownDatabases = ['chat', 'notes', 'securenotes'];
      await Promise.all(
        knownDatabases.map(dbName => {
          return new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => {
              console.log(`[Cleanup] Base de données ${dbName} effacée`);
              resolve();
            };
            request.onerror = () => {
              console.warn(`[Cleanup] Impossible d'effacer ${dbName}`);
              resolve();
            };
            request.onblocked = () => {
              console.warn(`[Cleanup] Effacement de ${dbName} bloqué`);
              resolve();
            };
          });
        })
      );

      // Méthode 2: Effacer toutes les bases (si supporté)
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            return new Promise((resolve) => {
              const request = indexedDB.deleteDatabase(db.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            });
          })
        );
      }

      console.log('[Cleanup] IndexedDB effacé');
    }
  } catch (error) {
    console.error('[Cleanup] Erreur lors de l\'effacement d\'IndexedDB:', error);
  }
};

/**
 * Efface tous les cookies (si possible)
 */
export const clearCookies = () => {
  try {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

      // Effacer le cookie pour tous les chemins et domaines possibles
      const domains = [window.location.hostname, `.${window.location.hostname}`];
      const paths = ['/', '/chat', '/notes'];

      for (let domain of domains) {
        for (let path of paths) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
        }
      }
    }
    console.log('[Cleanup] Cookies effacés');
  } catch (error) {
    console.error('[Cleanup] Erreur lors de l\'effacement des cookies:', error);
  }
};

/**
 * Nettoie l'historique de navigation
 * Note: Pour des raisons de sécurité, on ne peut pas effacer complètement l'historique
 * mais on peut manipuler l'état actuel pour éviter le retour arrière
 */
export const clearNavigationHistory = () => {
  try {
    // Remplacer l'état actuel pour éviter le retour arrière
    if (window.history.replaceState) {
      // Créer un nouvel état vide
      window.history.replaceState(null, '', '/notes');

      // Ajouter un nouvel état pour empêcher le retour arrière
      window.history.pushState(null, '', '/notes');

      console.log('[Cleanup] Historique de navigation nettoyé');
    }
  } catch (error) {
    console.error('[Cleanup] Erreur lors du nettoyage de l\'historique:', error);
  }
};

/**
 * Efface le cache mémoire (force le garbage collection si possible)
 */
export const clearMemoryCache = () => {
  try {
    // Forcer le garbage collection (si disponible)
    if (window.gc) {
      window.gc();
      console.log('[Cleanup] Garbage collection forcé');
    }

    // Vider les variables globales potentiellement sensibles
    if (window.chatData) delete window.chatData;
    if (window.messages) delete window.messages;
    if (window.userData) delete window.userData;

    console.log('[Cleanup] Cache mémoire nettoyé');
  } catch (error) {
    console.error('[Cleanup] Erreur lors du nettoyage du cache mémoire:', error);
  }
};

/**
 * NETTOYAGE COMPLET - Efface TOUTES les traces
 * À utiliser lors de la sortie du chat ou en mode panique
 */
export const performCompleteCleanup = async (redirectUrl = '/notes') => {
  console.log('[Cleanup] Début du nettoyage complet...');

  try {
    // Effectuer tous les nettoyages en parallèle pour plus de rapidité
    await Promise.all([
      clearServiceWorkerCaches(),
      clearIndexedDB(),
    ]);

    // Nettoyages synchrones
    clearLocalStorage();
    clearSessionStorage();
    clearCookies();
    clearMemoryCache();
    clearNavigationHistory();

    console.log('[Cleanup] Nettoyage complet terminé');

    // Rediriger avec replace pour éviter l'historique
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  } catch (error) {
    console.error('[Cleanup] Erreur lors du nettoyage complet:', error);
    // Rediriger quand même pour la sécurité
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }
};

/**
 * NETTOYAGE PARTIEL - Nettoie seulement les données d'une conversation spécifique
 * À utiliser lors de la sortie d'une conversation normale (pas en mode panique)
 */
export const performPartialCleanup = async (roomId, redirectUrl = '/notes') => {
  console.log('[Cleanup] Début du nettoyage partiel pour la room:', roomId);

  try {
    // Nettoyer les données spécifiques à cette conversation

    // 1. Nettoyer IndexedDB pour cette room
    if ('indexedDB' in window) {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('chat', 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const index = store.index('roomId');
      const request = index.openCursor(IDBKeyRange.only(roomId));

      await new Promise((resolve) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => resolve();
      });

      db.close();
      console.log('[Cleanup] Messages de la room effacés d\'IndexedDB');
    }

    // 2. Nettoyer sessionStorage
    clearSessionStorage();

    // 3. Nettoyer localStorage des données de cette conversation
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const updatedConversations = conversations.filter(c => c.id !== roomId);
      localStorage.setItem('conversations', JSON.stringify(updatedConversations));

      // Nettoyer le token admin de cette room
      localStorage.removeItem(`adminToken_${roomId}`);

      console.log('[Cleanup] Données de la conversation effacées du localStorage');
    } catch (e) {
      console.error('[Cleanup] Erreur lors du nettoyage du localStorage:', e);
    }

    // 4. Nettoyer le cache du service worker pour les URLs de cette room
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        for (const request of requests) {
          if (request.url.includes(roomId)) {
            await cache.delete(request);
          }
        }
      }
      console.log('[Cleanup] Cache du service worker nettoyé pour cette room');
    }

    console.log('[Cleanup] Nettoyage partiel terminé');

    // Rediriger avec replace pour éviter l'historique
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  } catch (error) {
    console.error('[Cleanup] Erreur lors du nettoyage partiel:', error);
    // Rediriger quand même pour la sécurité
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }
};

/**
 * MODE PANIQUE - Nettoyage ultra-rapide et redirection immédiate
 * Utilisé lors du raccourci clavier Ctrl+Shift+Escape
 */
export const performPanicModeCleanup = async () => {
  console.log('[PANIC] Mode panique activé !');

  // Nettoyer immédiatement sans attendre
  try {
    // Nettoyages synchrones d'abord (plus rapides)
    clearLocalStorage();
    clearSessionStorage();
    clearCookies();
    clearMemoryCache();

    // Rediriger IMMÉDIATEMENT pour cacher l'interface
    window.location.replace('/notes?error=sync_failed');

    // Continuer le nettoyage en arrière-plan (si possible avant le redirect)
    clearServiceWorkerCaches();
    clearIndexedDB();

  } catch (error) {
    console.error('[PANIC] Erreur en mode panique:', error);
    // Rediriger quand même
    window.location.replace('/notes?error=sync_failed');
  }
};
