'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PanicWrapper } from '../../../components/PanicWrapper';
import { useDoubleClickTrigger } from '../../../hooks/useDoubleClickTrigger';

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationName, setConversationName] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(Date.now());
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Double-clic pour sortir du chat vers /notes
  useDoubleClickTrigger(() => router.push('/notes'));

  useEffect(() => {
    // Vérifier le statut admin
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);

    loadConversationInfo();
    loadMessages();

    // Démarrer le polling pour les nouveaux messages
    startPolling();

    return () => {
      // Nettoyer le polling à la sortie
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversationInfo = () => {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const conv = conversations.find(c => c.id === roomId);
    if (conv) {
      setConversationName(conv.name);
      setAccessPassword(conv.accessPassword || '');
    } else {
      setConversationName(`Conversation ${roomId}`);
      setAccessPassword('');
    }
  };

  const saveAccessPassword = () => {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const updatedConversations = conversations.map(c =>
      c.id === roomId ? { ...c, accessPassword: accessPassword } : c
    );
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    setShowPasswordModal(false);
    alert('Mot de passe d\'accès enregistré !');
  };

  const loadMessages = async () => {
    try {
      const db = await openDB('chat', 2);
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('roomId');
      const request = index.getAll(roomId);

      request.onsuccess = () => {
        const roomMessages = request.result.sort((a, b) =>
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        setMessages(roomMessages);
      };
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage;
    setNewMessage(''); // Vider immédiatement pour UX réactive

    try {
      const message = {
        id: `${roomId}_${Date.now()}`,
        roomId: roomId,
        content: messageContent,
        timestamp: new Date().toISOString(),
        sentByAdmin: isAdmin, // Identifier qui envoie le message
      };

      // Afficher immédiatement le message localement
      setMessages(prev => [...prev, message]);

      // Sauvegarder dans IndexedDB
      const db = await openDB('chat', 2);
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      store.add(message);

      // Mettre à jour le dernier message dans la liste des conversations
      updateLastMessage(messageContent);

      // Envoyer au serveur pour synchronisation (avec l'ID du message)
      await fetch(`/api/chat/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: message.id, // Envoyer l'ID créé par le client
          content: messageContent,
          timestamp: message.timestamp,
          sentByAdmin: isAdmin // Envoyer qui a envoyé le message
        }),
      });

      // Marquer le timestamp pour éviter de récupérer notre propre message
      setLastFetchTimestamp(Date.now());
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const startPolling = () => {
    // Polling toutes les 3 secondes
    pollingIntervalRef.current = setInterval(() => {
      fetchNewMessages();
    }, 3000);

    // Premier fetch immédiat
    fetchNewMessages();
  };

  const fetchNewMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${roomId}?since=${lastFetchTimestamp}`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        // Merger les nouveaux messages avec les existants
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = data.messages.filter(m => !existingIds.has(m.id));

          if (newMessages.length > 0) {
            // Sauvegarder dans IndexedDB
            saveMessagesToIndexedDB(newMessages);

            // Mettre à jour le timestamp
            setLastFetchTimestamp(Date.now());

            return [...prev, ...newMessages].sort((a, b) =>
              new Date(a.timestamp) - new Date(b.timestamp)
            );
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Erreur lors du polling:', error);
    }
  };

  const saveMessagesToIndexedDB = async (newMessages) => {
    try {
      const db = await openDB('chat', 2);
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');

      for (const message of newMessages) {
        // Vérifier si le message existe déjà
        const existingMessage = await new Promise((resolve) => {
          const request = store.get(message.id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });

        if (!existingMessage) {
          store.add(message); // Conserver sentByAdmin original
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des messages:', error);
    }
  };

  const updateLastMessage = (content) => {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const updatedConversations = conversations.map(c =>
      c.id === roomId ? { ...c, lastMessage: content } : c
    );
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openDB = (name, version) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Supprimer l'ancien store si il existe (migration)
        if (db.objectStoreNames.contains('messages')) {
          db.deleteObjectStore('messages');
        }

        // Créer le nouveau store avec les bons index
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        messagesStore.createIndex('roomId', 'roomId', { unique: false });
      };
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    alert('Code copié ! Partagez-le avec votre contact.');
  };

  const clearMessages = async () => {
    if (!confirm('Effacer tous les messages de cette conversation ? Cette action est irréversible.')) {
      return;
    }

    try {
      // Supprimer les messages côté serveur pour TOUS les utilisateurs
      const response = await fetch(`/api/chat/${roomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression côté serveur');
      }

      // Supprimer les messages localement dans IndexedDB
      const db = await openDB('chat', 2);
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const index = store.index('roomId');
      const request = index.openCursor(IDBKeyRange.only(roomId));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Vider l'affichage local
      setMessages([]);

      // Mettre à jour le dernier message dans la liste
      updateLastMessage(null);

      alert('Messages supprimés pour tous les utilisateurs');
    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      alert('Erreur lors de la suppression des messages');
    }
  };

  const handleLogout = () => {
    if (confirm('Se déconnecter de la session admin ?')) {
      localStorage.removeItem('isAdmin');
      router.push('/');
    }
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-200 flex flex-col">
        {/* Header - Style WhatsApp */}
        <div className="bg-teal-600 text-white p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            {/* Bouton retour seulement pour admin */}
            {isAdmin && (
              <button
                onClick={() => router.push('/chat')}
                className="text-white hover:bg-teal-700 px-2 py-1 rounded"
              >
                ← Retour
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold">{conversationName}</h1>
              <p className="text-xs opacity-75">Code: {roomId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCodeModal(true)}
              className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-sm"
            >
              Partager
            </button>
            {/* Boutons admin */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm"
                >
                  🔑 Mot de passe
                </button>
                <button
                  onClick={clearMessages}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                >
                  Effacer
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  🚪
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages - Style WhatsApp */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-2"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23efeae2\'/%3E%3Cpath d=\'M20 10l5 5-5 5m15-10l5 5-5 5\' stroke=\'%23d4cfc5\' stroke-width=\'0.3\' fill=\'none\'/%3E%3C/svg%3E")',
            backgroundColor: '#efeae2'
          }}
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 mt-8 bg-yellow-100 border border-yellow-300 rounded-lg p-4 mx-auto max-w-sm">
              <p className="text-sm">🔒 Messages chiffrés de bout en bout</p>
              <p className="text-xs mt-2">Code: <strong>{roomId}</strong></p>
              <p className="text-xs mt-1 text-gray-500">Partagez ce code pour commencer</p>
            </div>
          ) : (
            messages.map(message => {
              // Déterminer si c'est MON message ou celui de l'autre
              // Si je suis admin et message envoyé par admin → mon message
              // Si je suis utilisateur et message envoyé par utilisateur → mon message
              const isMyMessage = (isAdmin && message.sentByAdmin) || (!isAdmin && !message.sentByAdmin);

              return (
                <div
                  key={message.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md px-3 py-2 shadow-sm ${
                      isMyMessage
                        ? 'bg-dcf8c6 rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                        : 'bg-white rounded-tl-lg rounded-tr-lg rounded-br-lg'
                    }`}
                    style={{
                      backgroundColor: isMyMessage ? '#dcf8c6' : '#ffffff'
                    }}
                  >
                    <p className="text-sm text-gray-800 break-words">{message.content}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1`}>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMyMessage && (
                        <span className="text-xs text-gray-500">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Style WhatsApp */}
        <div className="bg-gray-100 p-3 border-t border-gray-300">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message"
              className="flex-1 px-4 py-3 bg-white border-none rounded-full focus:outline-none text-sm"
            />
            <button
              onClick={sendMessage}
              className="w-12 h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
              disabled={!newMessage.trim()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Share Code Modal */}
        {showCodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Partager cette conversation</h2>
              <p className="text-gray-600 mb-3">
                Partagez ce code avec votre contact pour qu'il puisse rejoindre la conversation :
              </p>
              <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
                <p className="text-3xl font-bold tracking-wider text-green-600">{roomId}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Fermer
                </button>
                <button
                  onClick={copyCode}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Copier le code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">🔑 Mot de passe d'accès</h2>
              <p className="text-gray-600 mb-3">
                Configurez un mot de passe ou une phrase que l'utilisateur devra taper dans une note pour accéder à ce chat.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                💡 L'utilisateur tape ce mot de passe dans le titre ou le contenu d'une note, puis clique sur "Ajouter". Il sera automatiquement redirigé vers ce chat.
              </p>
              <input
                type="text"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Ex: rendez-vous secret"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    loadConversationInfo(); // Recharger pour annuler les changements
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={saveAccessPassword}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanicWrapper>
  );
}
