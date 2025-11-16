'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Modal qui s'ouvre après avoir tapé la séquence de couleurs correcte
 * Permet d'entrer le code de conversation pour accéder au chat
 */
export function ChatAccessModal({ isOpen, onClose, sequenceType = 'user' }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Veuillez entrer un code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const trimmedCode = code.trim();
      const isAdmin = sequenceType === 'admin';

      console.log(`[ChatAccess] Tentative de connexion. Mode: ${isAdmin ? 'Admin' : 'User'}, Code: ${trimmedCode}`);

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: trimmedCode,
          password: trimmedCode, // Le backend ne l'utilisera que si isAdmin est true
          isAdmin: isAdmin,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('[ChatAccess] Authentification réussie:', data);

        // Stocker le statut admin
        localStorage.setItem('isAdmin', data.isAdmin.toString());

        // Rediriger vers le chat
        router.push(`/chat/${data.roomId}`);
        onClose();
      } else {
        console.error('[ChatAccess] Erreur authentification:', data);
        setError(data.message || 'Code invalide ou erreur serveur');
      }
    } catch (error) {
      console.error('[ChatAccess] Erreur:', error);
      setError('Une erreur de connexion est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-md w-full shadow-2xl animate-slideUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {sequenceType === 'admin' ? '🔐 Accès Admin' : '💬 Accès Chat'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {sequenceType === 'admin'
            ? 'Entrez le code admin pour accéder en mode administrateur'
            : 'Entrez le code de conversation pour rejoindre le chat'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {sequenceType === 'admin' ? 'Code Admin' : 'Code de Conversation'}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder={sequenceType === 'admin' ? 'ADMIN_XXXXXX' : 'XYZ123'}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Accéder'
              )}
            </button>
          </div>
        </form>

        {/* Hint subtil */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {sequenceType === 'admin'
              ? '✨ Vous avez débloqué l\'accès admin'
              : '✨ Séquence secrète validée'}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
