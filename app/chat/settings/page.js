'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PanicWrapper } from '../../../components/PanicWrapper';

export default function SettingsPage() {
  const router = useRouter();
  const [adminCode, setAdminCode] = useState('');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' ou 'error'

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      router.push('/');
      return;
    }

    // Charger le code admin actuel
    const currentCode = localStorage.getItem('adminCode') || 'ADMIN2025';
    setAdminCode(currentCode);
  }, [router]);

  const handleSave = () => {
    // Validation
    if (!newAdminCode.trim()) {
      setMessage('Veuillez entrer un nouveau code admin');
      setMessageType('error');
      return;
    }

    if (newAdminCode.length < 6) {
      setMessage('Le code admin doit contenir au moins 6 caractères');
      setMessageType('error');
      return;
    }

    if (!/^[A-Z0-9]+$/.test(newAdminCode.toUpperCase())) {
      setMessage('Le code admin doit contenir uniquement des lettres et chiffres');
      setMessageType('error');
      return;
    }

    if (newAdminCode !== confirmCode) {
      setMessage('Les deux codes ne correspondent pas');
      setMessageType('error');
      return;
    }

    // Sauvegarder le nouveau code
    localStorage.setItem('adminCode', newAdminCode.toUpperCase());
    setAdminCode(newAdminCode.toUpperCase());
    setNewAdminCode('');
    setConfirmCode('');
    setMessage('Code admin mis à jour avec succès!');
    setMessageType('success');

    // Effacer le message après 3 secondes
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const handleLogout = () => {
    if (confirm('Se déconnecter de la session admin ?')) {
      localStorage.removeItem('isAdmin');
      router.push('/');
    }
  };

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-teal-600 text-white p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chat')}
              className="text-white hover:bg-teal-700 px-2 py-1 rounded"
            >
              ← Retour
            </button>
            <div>
              <h1 className="text-lg font-semibold">⚙️ Paramètres Admin</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            🚪
          </button>
        </div>

        {/* Contenu */}
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Code d'accès admin</h2>

            {/* Code actuel */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Code actuel:</p>
              <p className="text-2xl font-mono font-bold text-teal-600">{adminCode}</p>
              <p className="text-xs text-gray-500 mt-2">
                Tapez <span className="font-mono bg-gray-200 px-1">GO:{adminCode}</span> pour accéder en mode admin
              </p>
            </div>

            {/* Message de feedback */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg ${
                messageType === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {message}
              </div>
            )}

            {/* Formulaire de changement */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau code admin
                </label>
                <input
                  type="text"
                  value={newAdminCode}
                  onChange={(e) => setNewAdminCode(e.target.value.toUpperCase())}
                  placeholder="Minimum 6 caractères"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le nouveau code
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                  placeholder="Retapez le code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  maxLength={20}
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold transition-colors"
              >
                Enregistrer le nouveau code
              </button>
            </div>

            {/* Avertissement */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Notez bien votre nouveau code admin.
                Il sera nécessaire pour accéder au panneau d'administration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PanicWrapper>
  );
}
