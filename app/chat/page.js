'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PanicWrapper } from '../../components/PanicWrapper';
import { useDoubleClickTrigger } from '../../hooks/useDoubleClickTrigger';

export default function ChatListPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newConversationName, setNewConversationName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [ephemeralMode, setEphemeralMode] = useState(false);

  // Double-clic pour sortir du chat vers /notes
  useDoubleClickTrigger(() => {
    // Si mode éphémère activé, effacer tout avant de sortir
    if (ephemeralMode) {
      clearAllData();
    }
    router.push('/notes');
  });

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      // Non admin = redirection vers la page d'accueil
      router.push('/');
      return;
    }

    loadConversations();
    loadSettings();
  }, [router]);

  const loadConversations = () => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
  };

  const loadSettings = () => {
    const savedEphemeral = localStorage.getItem('ephemeralMode');
    if (savedEphemeral) {
      setEphemeralMode(savedEphemeral === 'true');
    }
  };

  const toggleEphemeralMode = () => {
    const newValue = !ephemeralMode;
    setEphemeralMode(newValue);
    localStorage.setItem('ephemeralMode', newValue.toString());
  };

  const clearAllData = async () => {
    try {
      // Effacer toutes les conversations
      localStorage.removeItem('conversations');
      setConversations([]);

      // Effacer tous les messages de IndexedDB
      const db = await openDB('chat', 2);
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      store.clear();
    } catch (error) {
      console.error('Erreur lors du nettoyage des données:', error);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans O, 0, I, 1 pour éviter confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createConversation = () => {
    if (!newConversationName.trim()) return;

    const code = generateCode();
    const conversation = {
      id: code,
      name: newConversationName,
      createdAt: new Date().toISOString(),
      lastMessage: null,
    };

    const updatedConversations = [...conversations, conversation];
    setConversations(updatedConversations);
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));

    setShowCreateModal(false);
    setNewConversationName('');
    router.push(`/chat/${code}`);
  };

  const joinConversation = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    // Vérifier si la conversation existe déjà
    const existing = conversations.find(c => c.id === code);
    if (existing) {
      router.push(`/chat/${code}`);
      return;
    }

    // Créer une nouvelle entrée pour cette conversation
    const conversation = {
      id: code,
      name: `Conversation ${code}`,
      createdAt: new Date().toISOString(),
      lastMessage: null,
    };

    const updatedConversations = [...conversations, conversation];
    setConversations(updatedConversations);
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));

    setShowJoinModal(false);
    setJoinCode('');
    router.push(`/chat/${code}`);
  };

  const deleteConversation = (id) => {
    if (!confirm('Supprimer cette conversation ?')) return;

    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));

    // Supprimer aussi les messages de IndexedDB
    openDB('chat', 2).then(db => {
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const index = store.index('roomId');
      const request = index.openCursor(IDBKeyRange.only(id));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
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

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-100">
        {/* Header - Style WhatsApp */}
        <div className="bg-teal-600 text-white p-4 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">SecureChat</h1>
              <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-semibold rounded">
                Admin
              </span>
            </div>
            <p className="text-xs opacity-90">Toutes vos conversations</p>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-sm"
          >
            ⚙️ Paramètres
          </button>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto p-4">
          {/* Buttons - Style WhatsApp */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium shadow-md"
            >
              ✚ Nouvelle conversation
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md"
            >
              🔑 Rejoindre
            </button>
          </div>

          {/* Conversations List */}
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Aucune conversation</p>
              <p className="text-sm">Créez-en une ou rejoignez avec un code</p>
            </div>
          ) : (
            <div className="space-y-1 bg-white rounded-lg shadow-md overflow-hidden">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/chat/${conv.id}`)}
                >
                  <div className="p-4 flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {conv.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                        <span className="text-xs text-gray-500 ml-2">Code: {conv.id}</span>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm px-2 flex-shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Nouvelle conversation</h2>
              <input
                type="text"
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createConversation()}
                placeholder="Nom du contact"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={createConversation}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Rejoindre une conversation</h2>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && joinConversation()}
                placeholder="Code (ex: ABC123)"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={joinConversation}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Paramètres</h2>

              <div className="space-y-4">
                {/* Mode éphémère */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Mode éphémère</h3>
                    <p className="text-sm text-gray-600">Efface tout en quittant le chat</p>
                  </div>
                  <button
                    onClick={toggleEphemeralMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      ephemeralMode ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        ephemeralMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Bouton effacer tout */}
                <button
                  onClick={() => {
                    if (confirm('Effacer toutes les conversations et tous les messages ? Cette action est irréversible.')) {
                      clearAllData();
                      setShowSettingsModal(false);
                    }
                  }}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                  Effacer toutes les données
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanicWrapper>
  );
}
