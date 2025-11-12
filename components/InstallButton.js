'use client';

import { useState, useEffect } from 'react';

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;

    if (isStandalone) {
      // App déjà installée, ne pas montrer le bouton
      return;
    }

    // Pour iOS, toujours montrer le bouton (instructions manuelles)
    if (iOS) {
      setShowInstallButton(true);
      return;
    }

    // Pour Android/Desktop Chrome, Edge, etc.
    const handleBeforeInstallPrompt = (e) => {
      // Empêcher le mini-infobar de s'afficher sur mobile
      e.preventDefault();
      // Garder l'événement pour l'utiliser plus tard
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Afficher les instructions pour iOS
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Réinitialiser le prompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2l3-4-3-4h2l3 4-3 4z" />
          <path d="M11 8h2v8h-2z" />
        </svg>
        {isIOS ? 'Installer l\'app' : 'Installer l\'app'}
      </button>

      {/* Modal pour instructions iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">📱 Installer sur iOS</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <p className="font-semibold">Pour installer cette application sur votre iPhone ou iPad :</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Appuyez sur le bouton <strong>Partager</strong> (icône carré avec flèche vers le haut) en bas de Safari</li>
                <li>Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Appuyez sur <strong>"Ajouter"</strong> en haut à droite</li>
              </ol>
              <p className="text-xs text-gray-500 mt-4">
                ℹ️ Cette application apparaîtra sur votre écran d'accueil et fonctionnera comme une vraie application.
              </p>
            </div>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
}
