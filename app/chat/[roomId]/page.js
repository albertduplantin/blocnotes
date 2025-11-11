'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PanicWrapper } from '../../../components/PanicWrapper';

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationName, setConversationName] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversationInfo();
    loadMessages();
  }, [roomId]);

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
      const db = await openDB('chat', 1);
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

    try {
      const message = {
        id: `${roomId}_${Date.now()}`,
        roomId: roomId,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isSent: true,
      };

      // Sauvegarder dans IndexedDB
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      store.add(message);

      setMessages([...messages, message]);
      setNewMessage('');

      // Mettre à jour le dernier message dans la liste des conversations
      updateLastMessage(newMessage);

      // Simuler l'envoi au serveur (à implémenter plus tard)
      // await fetch('/api/messages', {
      //   method: 'POST',
      //   body: JSON.stringify({ roomId, content: newMessage }),
      // });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
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
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('roomId', 'roomId', { unique: false });
        }
      };
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    alert('Code copié ! Partagez-le avec votre contact.');
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-green-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chat')}
              className="text-white hover:bg-green-600 px-2 py-1 rounded"
            >
              ← Retour
            </button>
            <div>
              <h1 className="text-lg font-semibold">{conversationName}</h1>
              <p className="text-xs opacity-75">Code: {roomId}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCodeModal(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Partager code
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>Aucun message</p>
              <p className="text-sm mt-2">Partagez le code <strong>{roomId}</strong> pour commencer à chatter</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    message.isSent
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.isSent ? 'text-green-100' : 'text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tapez un message..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
            >
              Envoyer
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
      </div>
    </PanicWrapper>
  );
}
