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
  const [newConversationName, setNewConversationName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Double-clic pour sortir du chat vers /notes
  useDoubleClickTrigger(() => {
    // Si mode éphémère activé, effacer tout avant de sortir
    if (ephemeralMode) {
      clearAllData();
    }
    router.push('/notes');
  });

  useEffect(() => {
    // We can't check the token directly, but the backdoor mechanism
    // sets a local storage flag for the UI.
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      router.push('/');
      return;
    }

    loadAllRooms();
    loadSettings();
  }, [router]);

  const loadAllRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms');
      if (!response.ok) {
        // If token is invalid/expired, the API will return 403.
        // We should log out the user.
        if (response.status === 403) {
          handleLogout(true); // Force logout
        }
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setConversations(data.data.rooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
      // Optionally show an error message to the user
    } finally {
      setIsLoading(false);
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

  const handleLogout = (isForced = false) => {
    if (isForced || confirm('Se déconnecter de la session admin ?')) {
      localStorage.removeItem('isAdmin');
      // We should also clear the auth cookie, but we can't do that from the client.
      // The user will be redirected to the login page anyway.
      router.push('/');
    }
  };

  const clearAllData = async () => {
    try {
      // This function is now less relevant as conversations are not stored locally.
      // It could be used to clear other local data if needed.
      console.log("Clearing local data...");
    } catch (error) {
      console.error('Erreur lors du nettoyage des données:', error);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createConversation = () => {
    if (!newConversationName.trim()) return;
    const code = generateCode();
    // This just navigates, the room will appear on next refresh.
    // A more advanced implementation would update the state.
    router.push(`/chat/${code}`);
  };

  const joinConversation = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    // This just navigates, the room will appear on next refresh.
    router.push(`/chat/${code}`);
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-teal-600 text-white p-4 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">SecureChat</h1>
              <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-semibold rounded">
                Admin
              </span>
            </div>
            <p className="text-xs opacity-90">Toutes les conversations</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/chat/settings')}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-sm"
            >
              ⚙️ Paramètres
            </button>
            <button
              onClick={() => handleLogout(false)}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto p-4">
          {/* Buttons */}
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
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Chargement des conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Aucune conversation trouvée</p>
              <p className="text-sm">Créez-en une pour commencer</p>
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
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {conv.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                        <span className="text-xs text-gray-500 ml-2">Code: {conv.id}</span>
                      </div>
                    </div>
                    <button
                      disabled
                      className="text-gray-400 text-sm px-2 flex-shrink-0 cursor-not-allowed"
                      title="La suppression est désactivée dans ce panneau"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals (unchanged) */}
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
                <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800">Annuler</button>
                <button onClick={createConversation} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Créer</button>
              </div>
            </div>
          </div>
        )}
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
                <button onClick={() => setShowJoinModal(false)} className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800">Annuler</button>
                <button onClick={joinConversation} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Rejoindre</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanicWrapper>
  );
}
