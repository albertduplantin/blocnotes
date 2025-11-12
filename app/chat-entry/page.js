'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanicWrapper } from '../../components/PanicWrapper';

export default function ChatEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleJoin = () => {
    const trimmedCode = code.trim().toUpperCase();

    // Si c'est le code admin, aller vers /chat
    if (trimmedCode === process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      localStorage.setItem('isAdmin', 'true');
      router.push('/chat');
    }
    // Sinon, aller directement vers la conversation
    else if (trimmedCode) {
      localStorage.setItem('isAdmin', 'false');
      router.push(`/chat/${trimmedCode}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          {/* Logo/Titre */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">SecureChat</h1>
            <p className="text-gray-600">Conversations chiffrées</p>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Code de conversation
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Entrez votre code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-lg font-semibold uppercase tracking-wider"
                maxLength={20}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                6 caractères fournis par votre contact
              </p>
            </div>

            <button
              onClick={handleJoin}
              className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!code.trim()}
            >
              Rejoindre la conversation
            </button>
          </div>

          {/* Info sécurité */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Chiffrement de bout en bout</span>
            </div>
          </div>

          {/* Lien Notes */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-teal-600 hover:text-teal-700 underline"
            >
              Retour aux notes
            </button>
          </div>
        </div>
      </div>
    </PanicWrapper>
  );
}
