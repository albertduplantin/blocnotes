'use client';

import { useState, useEffect } from 'react';
import { useDoubleClickTrigger } from '../../hooks/useDoubleClickTrigger';
import { useKeyComboTrigger } from '../../hooks/useKeyComboTrigger';

const colors = ['#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8'];

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#ffffff' });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Vérifier les paramètres d'URL pour les erreurs
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'sync_failed') {
      setErrorMessage('Sync échouée - Mode offline activé');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Charger les notes depuis localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('notesSync');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Sauvegarder les notes dans localStorage
  useEffect(() => {
    localStorage.setItem('notesSync', JSON.stringify(notes));
  }, [notes]);

  // Déclencheurs pour le mode secret
  useDoubleClickTrigger(() => window.location.href = '/chat');
  useKeyComboTrigger(['Alt', 'F9'], () => window.location.href = '/chat');
  useKeyComboTrigger(['Control', 'Shift', 'KeyM'], () => window.location.href = '/chat');
  useKeyComboTrigger(['*'], () => window.location.href = '/chat');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNote = () => {
    if (newNote.title.trim() || newNote.content.trim()) {
      const note = {
        id: Date.now(),
        ...newNote,
        createdAt: new Date().toISOString(),
      };
      setNotes([note, ...notes]);
      setNewNote({ title: '', content: '', color: '#ffffff' });
    }
  };

  const updateNote = (id, updates) => {
    setNotes(notes.map(note => note.id === id ? { ...note, ...updates } : note));
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
          placeholder="Rechercher des notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Nouvelle note */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <input
            type="text"
            placeholder="Titre"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            className="w-full mb-2 p-2 border-none outline-none text-lg font-medium"
          />
          <textarea
            placeholder="Contenu de la note"
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
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={addNote}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Grille des notes */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className="p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            style={{ backgroundColor: note.color }}
            onClick={() => setEditingNote(note)}
          >
            <h3 className="font-medium mb-2">{note.title}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
            <div className="mt-2 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal d'édition */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <input
              type="text"
              value={editingNote.title}
              onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              className="w-full mb-2 p-2 border border-gray-300 rounded"
            />
            <textarea
              value={editingNote.content}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              rows="5"
            />
            <div className="flex justify-between">
              <button
                onClick={() => setEditingNote(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  updateNote(editingNote.id, editingNote);
                  setEditingNote(null);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}