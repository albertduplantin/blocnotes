'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCodeDetection } from '../hooks/useCodeDetection';
import { PanicWrapper } from '../components/PanicWrapper';
import { MobileMenu } from '../components/MobileMenu';
import { InstallButton } from '../components/InstallButton';

const colors = ['#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8'];

export default function HomePage() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#ffffff' });
  const [userName, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // Détection de code secret par frappe clavier
  useCodeDetection();

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const savedUser = localStorage.getItem('notesUser');
    if (savedUser) {
      setUserName(savedUser);
      setIsLoggedIn(true);
      loadUserNotes(savedUser);
    }
  }, []);

  // Sauvegarder les notes quand elles changent
  useEffect(() => {
    if (isLoggedIn && userName) {
      localStorage.setItem(`notes_${userName}`, JSON.stringify(notes));
    }
  }, [notes, isLoggedIn, userName]);

  const loadUserNotes = (username) => {
    const savedNotes = localStorage.getItem(`notes_${username}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      setNotes([]);
    }
  };

  const handleAuth = () => {
    const { username, password } = authForm;

    if (!username.trim() || !password.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (authMode === 'register') {
      // Vérifier si l'utilisateur existe déjà
      const existingUsers = JSON.parse(localStorage.getItem('notesUsers') || '{}');
      if (existingUsers[username]) {
        alert('Ce nom d\'utilisateur existe déjà');
        return;
      }

      // Enregistrer le nouvel utilisateur
      existingUsers[username] = password; // En prod, hasher le mot de passe !
      localStorage.setItem('notesUsers', JSON.stringify(existingUsers));

      // Connecter automatiquement
      localStorage.setItem('notesUser', username);
      setUserName(username);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      setAuthForm({ username: '', password: '' });
      loadUserNotes(username);
    } else {
      // Mode connexion
      const existingUsers = JSON.parse(localStorage.getItem('notesUsers') || '{}');
      if (existingUsers[username] === password) {
        localStorage.setItem('notesUser', username);
        setUserName(username);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '' });
        loadUserNotes(username);
      } else {
        alert('Identifiants incorrects');
      }
    }
  };

  const handleLogout = () => {
    if (confirm('Se déconnecter ?')) {
      localStorage.removeItem('notesUser');
      setUserName('');
      setIsLoggedIn(false);
      setNotes([]);
    }
  };

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

  // Si pas connecté, afficher la page de connexion
  if (!isLoggedIn) {
    return (
      <PanicWrapper>
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 Mes Notes</h1>
              <p className="text-gray-600">Connectez-vous pour accéder à vos notes</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre nom d'utilisateur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre mot de passe"
                />
              </div>

              <button
                onClick={handleAuth}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md"
              >
                {authMode === 'login' ? 'Se connecter' : 'S\'inscrire'}
              </button>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {authMode === 'login' ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
              </button>
            </div>

          </div>
        </div>
      </PanicWrapper>
    );
  }

  // Interface principale des notes (quand connecté)
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

              {/* Desktop logout button */}
              <button
                onClick={handleLogout}
                className="hidden md:block px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                🚪 Déconnexion
              </button>

              {/* Mobile menu */}
              <MobileMenu userName={userName} onLogout={handleLogout} />
            </div>
          </div>
        </div>

        <div className="p-4">
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
                <div className="flex space-x-2">
                  {colors.slice(0, 5).map(color => (
                    <button
                      key={color}
                      onClick={() => setNewNote({ ...newNote, color })}
                      className={`w-6 h-6 rounded-full border-2 ${newNote.color === color ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      title="Choisir une couleur"
                    />
                  ))}
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
        </div>
      </div>
    </PanicWrapper>
  );
}

