'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PanicWrapper } from '../../../components/PanicWrapper';
import { useDoubleClickTrigger } from '../../../hooks/useDoubleClickTrigger';
import { getUserColorScheme } from '../../../utils/colorUtils';
import ThemeToggle from '../../../components/ThemeToggle';
import { showMessageNotification } from '../../../utils/notifications';
import NotificationButton from '../../../components/NotificationButton';

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationName, setConversationName] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(Date.now());
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Double-clic pour sortir du chat vers /notes
  useDoubleClickTrigger(() => router.push('/notes'));

  useEffect(() => {
    // Vérifier le statut admin et token
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    const storedToken = localStorage.getItem(`adminToken_${roomId}`);
    setIsAdmin(adminStatus && storedToken);
    setAdminToken(storedToken);

    loadConversationInfo();
    loadMessages();

    // Connect to Server-Sent Events for real-time updates
    connectToSSE();

    // Poll for typing indicators
    const typingInterval = setInterval(checkTypingStatus, 1000);

    return () => {
      // Clean up SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearInterval(typingInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversationInfo = () => {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const conv = conversations.find(c => c.id === roomId);
    if (conv) {
      setConversationName(conv.name);
    } else {
      setConversationName(`Conversation ${roomId}`);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);

      // Charger depuis le serveur (source de vérité)
      const response = await fetch(`/api/chat/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);

        // Sauvegarder dans IndexedDB pour backup
        const db = await openDB('chat', 2);
        const transaction = db.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');

        for (const message of data.messages || []) {
          try {
            await new Promise((resolve, reject) => {
              const request = store.put(message);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          } catch (e) {
            // Ignorer les erreurs de duplication
          }
        }
      } else {
        throw new Error('Erreur de chargement');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      showToast('Erreur de chargement des messages', 'error');

      // Fallback sur IndexedDB si serveur inaccessible
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
      } catch (e) {
        console.error('Erreur IndexedDB:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner une image', 'error');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('L\'image ne doit pas dépasser 5MB', 'error');
      return;
    }

    setSelectedImage(file);

    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const cancelImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      console.log('[Upload] Envoi de l\'image:', selectedImage.name, selectedImage.type, selectedImage.size);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('[Upload] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Upload] Error response:', errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }

      const data = await response.json();
      console.log('[Upload] Success:', data);
      return data.url;
    } catch (error) {
      console.error('[Upload] Erreur lors de l\'upload:', error);
      showToast(`Erreur: ${error.message}`, 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    const hasText = newMessage.trim();
    const hasImage = selectedImage;

    if (!hasText && !hasImage) return;

    const messageContent = newMessage;
    setNewMessage(''); // Vider immédiatement pour UX réactive

    try {
      // Uploader l'image si présente
      let imageUrl = null;
      if (hasImage) {
        imageUrl = await uploadImage();
        if (!imageUrl) return; // Annuler si l'upload échoue
      }

      const message = {
        id: `${roomId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        roomId: roomId,
        content: messageContent,
        imageUrl: imageUrl, // Ajouter l'URL de l'image
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
      const lastMessageText = imageUrl ? (messageContent || '📷 Photo') : messageContent;
      updateLastMessage(lastMessageText);

      // Envoyer au serveur pour synchronisation
      await fetch(`/api/chat/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: message.id,
          content: messageContent,
          imageUrl: imageUrl,
          timestamp: message.timestamp,
          sentByAdmin: isAdmin
        }),
      });

      // Réinitialiser l'image
      cancelImage();

      // Marquer le timestamp pour éviter de récupérer notre propre message
      setLastFetchTimestamp(Date.now());
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/chat/${roomId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(error.error || 'Erreur lors de la suppression', 'error');
        return;
      }

      // Remove message from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      showToast('Message supprimé', 'success');
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const clearAllMessages = async () => {
    if (!isAdmin) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUS les messages de cette conversation ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/${roomId}/messages/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(error.error || 'Erreur lors de la suppression', 'error');
        return;
      }

      const data = await response.json();
      setMessages([]);
      showToast(`${data.deletedCount} message(s) supprimé(s)`, 'success');
    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const connectToSSE = () => {
    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const since = new Date(lastFetchTimestamp).toISOString();
      const eventSource = new EventSource(`/api/chat/${roomId}/events?since=${since}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log('[SSE] Connected to room:', data.roomId);
          } else if (data.type === 'messages' && data.messages) {
            // New messages received
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMessages = data.messages.filter(m => !existingIds.has(m.id));

              if (newMessages.length > 0) {
                // Save to IndexedDB
                saveMessagesToIndexedDB(newMessages);
                setLastFetchTimestamp(Date.now());

                // Show notifications for messages from other users when page is not visible
                if (document.visibilityState === 'hidden') {
                  newMessages.forEach(message => {
                    // Only show notification if message is from another user
                    // If I'm admin, show notifications for user messages (sentByAdmin === false)
                    // If I'm user, show notifications for admin messages (sentByAdmin === true)
                    const isFromOtherUser = isAdmin ? !message.sentByAdmin : message.sentByAdmin;

                    if (isFromOtherUser) {
                      showMessageNotification(message, roomId);
                    }
                  });
                }

                return [...prev, ...newMessages].sort((a, b) =>
                  new Date(a.timestamp) - new Date(b.timestamp)
                );
              }
              return prev;
            });
          } else if (data.type === 'heartbeat') {
            // Keep connection alive
            console.log('[SSE] Heartbeat');
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        eventSource.close();

        // Reconnect after 5 seconds
        setTimeout(() => {
          console.log('[SSE] Reconnecting...');
          connectToSSE();
        }, 5000);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[SSE] Failed to connect:', error);
    }
  };

  const checkTypingStatus = async () => {
    try {
      const userKey = isAdmin ? 'admin' : 'user';
      const response = await fetch(`/api/chat/${roomId}/typing?userId=${userKey}`);
      if (response.ok) {
        const data = await response.json();
        setOtherUserTyping(data.isTyping);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleTyping = (typing) => {
    // Notify server of typing status
    const userKey = isAdmin ? 'admin' : 'user';
    fetch(`/api/chat/${roomId}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userKey, isTyping: typing, isAdmin })
    }).catch(() => {});

    if (typing) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 3000);
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
    showToast('Code copié !', 'success');
  };

  const clearMessages = async () => {
    if (!confirm('Effacer tous les messages de cette conversation ? Cette action est irréversible.')) {
      return;
    }

    if (!adminToken) {
      showToast('Vous devez être admin pour supprimer les messages', 'error');
      return;
    }

    try {
      // Supprimer les messages côté serveur pour TOUS les utilisateurs
      const response = await fetch(`/api/chat/${roomId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': adminToken
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
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

      showToast('Messages supprimés pour tous', 'success');
    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const handleLogout = () => {
    if (confirm('Se déconnecter de la session admin ?')) {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem(`adminToken_${roomId}`);
      setIsAdmin(false);
      setAdminToken(null);
      showToast('Déconnecté', 'info');
      router.push('/');
    }
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex flex-col">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white animate-slide-in ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' :
            toast.type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {toast.type === 'success' ? '✓' :
                 toast.type === 'error' ? '✕' :
                 toast.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-60 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400"></div>
              <span className="text-gray-700 dark:text-gray-200">Chargement...</span>
            </div>
          </div>
        )}

        {/* Header - Style WhatsApp */}
        <div className="bg-teal-600 dark:bg-teal-800 text-white p-2 sm:p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Bouton retour seulement pour admin */}
            {isAdmin && (
              <button
                onClick={() => router.push('/chat')}
                className="text-white hover:bg-teal-700 dark:hover:bg-teal-900 active:bg-teal-800 dark:active:bg-teal-950 px-2 py-1 rounded min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Retour"
              >
                ← <span className="hidden sm:inline ml-1">Retour</span>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-semibold truncate">{conversationName}</h1>
              <p className="text-xs opacity-75 truncate">
                {otherUserTyping ? (
                  <span className="text-green-200 dark:text-green-300">en train d'écrire...</span>
                ) : (
                  <span className="hidden sm:inline">{`Code: ${roomId}`}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center flex-wrap justify-end">
            <ThemeToggle />
            <NotificationButton />
            <button
              onClick={() => setShowCodeModal(true)}
              className="px-2 sm:px-3 py-1 bg-teal-700 dark:bg-teal-900 hover:bg-teal-800 dark:hover:bg-teal-950 active:bg-teal-900 dark:active:bg-black text-white rounded text-xs sm:text-sm min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Partager le code de conversation"
            >
              <span className="hidden sm:inline">Partager</span>
              <span className="sm:hidden">📤</span>
            </button>
            {/* Boutons admin */}
            {isAdmin && (
              <>
                <button
                  onClick={clearAllMessages}
                  className="px-2 sm:px-3 py-1 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 active:bg-red-700 dark:active:bg-red-800 text-white rounded text-xs sm:text-sm min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                  aria-label="Supprimer tous les messages"
                  title="Supprimer tous les messages de cette conversation"
                >
                  <span className="hidden sm:inline">Tout effacer</span>
                  <span className="sm:hidden">🗑️</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-3 py-1 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 active:bg-red-800 dark:active:bg-red-900 text-white rounded text-xs sm:text-sm min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                  aria-label="Déconnexion admin"
                >
                  🚪
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages - Style WhatsApp */}
        <div
          className="chat-container flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-[#efeae2] dark:bg-gray-800"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23efeae2\'/%3E%3Cpath d=\'M20 10l5 5-5 5m15-10l5 5-5 5\' stroke=\'%23d4cfc5\' stroke-width=\'0.3\' fill=\'none\'/%3E%3C/svg%3E")',
          }}
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 dark:text-gray-300 mt-8 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mx-auto max-w-sm">
              <p className="text-sm">🔒 Messages chiffrés de bout en bout</p>
              <p className="text-xs mt-2">Code: <strong>{roomId}</strong></p>
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Partagez ce code pour commencer</p>
            </div>
          ) : (
            <>
              {messages.map(message => {
                // Déterminer si c'est MON message ou celui de l'autre
                // Si je suis admin et message envoyé par admin → mon message
                // Si je suis utilisateur et message envoyé par utilisateur → mon message
                const isMyMessage = (isAdmin && message.sentByAdmin) || (!isAdmin && !message.sentByAdmin);

                // Generate unique user identifier for color
                const userIdentifier = `${roomId}_${message.sentByAdmin ? 'admin' : 'user'}`;
                const colorScheme = getUserColorScheme(userIdentifier, isMyMessage);

              return (
                <div
                  key={message.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs md:max-w-md px-3 py-2 shadow-sm ${
                      isMyMessage
                        ? 'rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                        : 'rounded-tl-lg rounded-tr-lg rounded-br-lg'
                    }`}
                    style={{
                      backgroundColor: colorScheme.background,
                      color: colorScheme.text
                    }}
                  >
                    {/* Image si présente */}
                    {message.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={message.imageUrl}
                          alt="Image partagée"
                          className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 active:opacity-80 touch-manipulation"
                          style={{ maxHeight: '250px', objectFit: 'contain' }}
                          onClick={() => window.open(message.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {/* Texte du message */}
                    {message.content && (
                      <p className="text-sm break-words" style={{ color: colorScheme.text }}>
                        {message.content}
                      </p>
                    )}
                    <div className={`flex items-center justify-between gap-2 mt-1`}>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] sm:text-xs opacity-70" style={{ color: colorScheme.text }}>
                          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMyMessage && (
                          <span className="text-[10px] sm:text-xs opacity-70" style={{ color: colorScheme.text }}>✓✓</span>
                        )}
                      </div>
                      {/* Delete button - show if user owns the message or if admin */}
                      {(isMyMessage || isAdmin) && (
                        <button
                          onClick={() => {
                            if (confirm('Supprimer ce message ?')) {
                              deleteMessage(message.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-xs p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
                          style={{ color: colorScheme.text }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}

              {/* Typing Indicator */}
              {otherUserTyping && (
                <div className="flex justify-start mb-2">
                  <div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Style WhatsApp */}
        <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 border-t border-gray-300 dark:border-gray-700">
          {/* Preview de l'image sélectionnée */}
          {imagePreview && (
            <div className="mb-3 relative max-w-sm mx-auto bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md">
              <button
                onClick={cancelImage}
                className="absolute top-1 right-1 bg-red-500 dark:bg-red-600 text-white rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-600 dark:hover:bg-red-700 active:bg-red-700 dark:active:bg-red-800 z-10 touch-manipulation"
                aria-label="Annuler l'image"
              >
                ✕
              </button>
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded-lg max-w-full h-auto"
                style={{ maxHeight: '150px', objectFit: 'contain' }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 truncate">
                {selectedImage?.name}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            {/* Input fichier caché */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Bouton photo */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 rounded-full transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 touch-manipulation"
              title="Ajouter une photo"
              aria-label="Ajouter une photo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(e.target.value.length > 0);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !uploading) {
                  handleTyping(false);
                  sendMessage();
                }
              }}
              onBlur={() => handleTyping(false)}
              disabled={uploading}
              placeholder="Message"
              className="flex-1 px-3 sm:px-4 py-3 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 border-none rounded-full focus:outline-none text-base sm:text-sm min-h-[44px]"
              style={{ fontSize: '16px' }}
            />
            <button
              onClick={sendMessage}
              className="min-w-[48px] min-h-[48px] sm:w-12 sm:h-12 bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-800 active:bg-teal-800 dark:active:bg-teal-900 text-white rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 touch-manipulation"
              disabled={uploading || (!newMessage.trim() && !selectedImage)}
              aria-label="Envoyer le message"
            >
              {uploading ? (
                <svg
                  className="animate-spin h-5 w-5 sm:h-5 sm:w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6 sm:w-5 sm:h-5"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Share Code Modal */}
        {showCodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg max-w-md w-full">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-gray-100">Partager cette conversation</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3">
                Partagez ce code avec votre contact pour qu'il puisse rejoindre la conversation :
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 sm:p-4 rounded-lg mb-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold tracking-wider text-green-600 dark:text-green-400">{roomId}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 active:bg-gray-100 dark:active:bg-gray-700 rounded-lg min-h-[44px] touch-manipulation"
                  aria-label="Fermer"
                >
                  Fermer
                </button>
                <button
                  onClick={copyCode}
                  className="flex-1 px-4 py-3 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 active:bg-green-700 dark:active:bg-green-800 min-h-[44px] touch-manipulation"
                  aria-label="Copier le code"
                >
                  Copier le code
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PanicWrapper>
  );
}
