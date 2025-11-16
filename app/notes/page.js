'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCodeDetection } from '../../hooks/useCodeDetection';
import { ChatAccessModal } from '../../components/ChatAccessModal';
import { PanicWrapper } from '../../components/PanicWrapper';
import { MobileMenu } from '../../components/MobileMenu';
import { InstallButton } from '../../components/InstallButton';
import ThemeToggle from '../../components/ThemeToggle'; // Added import

const colors = ['#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8'];

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#ffffff' });
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');

  // État pour le modal d'accès au chat
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatModalType, setChatModalType] = useState('user'); // 'user' ou 'admin'



  useEffect(() => {
    // Vérifier les paramètres d'URL pour les erreurs
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'sync_failed') {
      setErrorMessage('Sync échouée - Mode offline activé');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Charger les notes et le nom d'utilisateur depuis localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('notesSync');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }

    // Charger ou générer un nom d'utilisateur
    let savedUserName = localStorage.getItem('userName');
    if (!savedUserName) {
      savedUserName = `Utilisateur${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem('userName', savedUserName);
    }
    setUserName(savedUserName);
  }, []);

  // Sauvegarder les notes dans localStorage
  useEffect(() => {
    localStorage.setItem('notesSync', JSON.stringify(notes));
  }, [notes]);

  // Détection de code secret par frappe clavier
  useCodeDetection();

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNote = async () => {
    if (!newNote.title.trim() && !newNote.content.trim()) {
      return; // Ne rien faire si vide
    }

    // Vérifier si le titre ou le contenu contient un mot de passe de conversation
    try {
      console.log('[DEBUG] Fetching passwords...');
      const response = await fetch('/api/chat/passwords');
      console.log('[DEBUG] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Passwords data:', data);

        // Vérifications de sécurité
        if (data && data.passwords && typeof data.passwords === 'object') {
          const passwords = data.passwords;
          const passwordEntries = Object.entries(passwords);

          console.log('[DEBUG] Password entries count:', passwordEntries.length);

          if (passwordEntries.length > 0) {
            // Texte combiné du titre et contenu en minuscules pour comparaison insensible à la casse
            const combinedText = `${newNote.title || ''} ${newNote.content || ''}`.toLowerCase();
            console.log('[DEBUG] Combined text:', combinedText);

            // Vérifier chaque mot de passe
            for (const [roomId, password] of passwordEntries) {
              console.log('[DEBUG] Checking password for room:', roomId);

              if (password && typeof password === 'string' && password.trim()) {
                const passwordLower = password.toLowerCase();
                console.log('[DEBUG] Password to match:', passwordLower);

                if (combinedText.includes(passwordLower)) {
                  console.log('[DEBUG] Password match! Redirecting to:', roomId);
                  // Mot de passe trouvé ! Rediriger vers le chat sans sauvegarder la note
                  localStorage.setItem('isAdmin', 'false');
                  setNewNote({ title: '', content: '', color: '#ffffff' });
                  router.push(`/chat/${roomId}`);
                  return;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] Erreur lors de la vérification des mots de passe:', error);
    }

    // Pas de mot de passe trouvé, sauvegarder la note normalement
    console.log('[DEBUG] No password match, saving note');
    const note = {
      id: Date.now(),
      ...newNote,
      createdAt: new Date().toISOString(),
    };
    setNotes([note, ...notes]);
    setNewNote({ title: '', content: '', color: '#ffffff' });
  };

  const updateNote = (id, updates) => {
    setNotes(notes.map(note => note.id === id ? { ...note, ...updates } : note));
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const handleLogout = () => {
    if (confirm('Se déconnecter ?')) {
      // Clear notes data
      localStorage.removeItem('notesSync');
      localStorage.removeItem('userName');
      // Redirect to home
      router.push('/');
    }
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow-md relative">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📝 Mes Notes</h1>
              <p className="text-xs opacity-90">Connecté en tant que {userName}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Install button */}
              <InstallButton />

              {/* Theme Toggle */}
              <ThemeToggle
                setChatModalOpen={setChatModalOpen}
                setChatModalType={setChatModalType}
              />

              {/* Desktop logout button */}
              <button
                onClick={handleLogout}
                className="hidden md:block px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                🚪 Déconnexion
              </button>

              {/* Mobile menu */}
              <MobileMenu
                userName={userName}
                onLogout={handleLogout}
                setChatModalOpen={setChatModalOpen}
                setChatModalType={setChatModalType}
              />
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Message d'erreur */}
          {errorMessage && (
            <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          {/* Barre de recherche */}
          <div className="max-w-4xl mx-auto mb-6">
            <input
              type="text"
              placeholder="🔍 Rechercher dans mes notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Nouvelle note */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-blue-200">
              <h2 className="text-lg font-semibold mb-3 text-blue-700">✏️ Nouvelle Note</h2>
              <input
                type="text"
                placeholder="Titre de la note"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="w-full mb-2 p-2 border-none outline-none text-lg font-medium"
              />
              <textarea
                placeholder="Écrivez votre note ici..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="w-full mb-2 p-2 border-none outline-none resize-none"
                rows="3"
              />
              <div className="flex justify-between items-center">
                <div className="flex space-x-2 items-center">
                  {colors.slice(0, 5).map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        // Double fonctionnalité : change la couleur ET détecte la séquence
                        setNewNote({ ...newNote, color });
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                        newNote.color === color
                          ? 'border-blue-500 ring-2 ring-blue-300'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title="Choisir une couleur"
                    />
                  ))}
                  {/* Indicateur visuel subtil de progression (Removed) */}
                </div>
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors"
                >
                  ➕ Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="max-w-4xl mx-auto mb-4">
            <p className="text-sm text-gray-600">
              {filteredNotes.length} {filteredNotes.length > 1 ? 'notes' : 'note'} {searchTerm && '(filtrées)'}
            </p>
          </div>

          {/* Grille des notes */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <p className="text-lg mb-2">Aucune note</p>
                <p className="text-sm">Créez votre première note ci-dessus!</p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                  style={{ backgroundColor: note.color }}
                  onClick={() => setEditingNote(note)}
                >
                  {note.title && <h3 className="font-semibold mb-2 text-lg">{note.title}</h3>}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{note.content}</p>
                  <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(note.createdAt).toLocaleDateString('fr-FR')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Supprimer cette note ?')) {
                          deleteNote(note.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal d'édition */}
          {editingNote && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Modifier la note</h2>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  placeholder="Titre"
                  className="w-full mb-3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  placeholder="Contenu"
                  className="w-full mb-4 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="8"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditingNote(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      updateNote(editingNote.id, editingNote);
                      setEditingNote(null);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal d'accès au chat (après séquence de couleurs) */}
          <ChatAccessModal
            isOpen={chatModalOpen}
            onClose={() => setChatModalOpen(false)}
            sequenceType={chatModalType}
          />
        </div>
      </div>
    </PanicWrapper>
  );
}