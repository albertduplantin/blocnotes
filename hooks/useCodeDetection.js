import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useCodeDetection() {
  const router = useRouter();
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Fonction de vérification des codes (utilisée par les deux gestionnaires)
    const checkForCodes = (text) => {
      // Garde de sécurité : ne traiter que les chaînes de caractères
      if (typeof text !== 'string' || !text) {
        return false;
      }

      const upperText = text.toUpperCase();

      // Récupérer le code admin depuis localStorage (par défaut ADMIN2025)
      const adminCode = localStorage.getItem('adminCode') || 'ADMIN2025';

      // Vérifier si le texte contient "GO:" + code admin complet
      const adminPattern = new RegExp(`GO:${adminCode}(?![A-Z0-9])`);
      if (adminPattern.test(upperText)) {
        localStorage.setItem('isAdmin', 'true');
        router.push('/chat');
        return true;
      }

      // Vérifier si le texte contient "GO:" suivi de EXACTEMENT 6 caractères alphanumériques
      const goPattern = /GO:([A-Z0-9]{6})(?![A-Z0-9])/;
      const match = upperText.match(goPattern);
      if (match && match[1]) {
        const code = match[1]; // Extraire le code de 6 caractères
        // S'assurer que ce n'est pas le début du code admin
        if (code !== adminCode.substring(0, 6)) {
          localStorage.setItem('isAdmin', 'false');
          router.push(`/chat/${code}`);
          return true;
        }
      }

      return false;
    };

    // Gestionnaire pour les événements clavier (desktop)
    const handleKeyPress = (event) => {
      // Garde de sécurité pour s'assurer que event.key est une chaîne
      if (typeof event.key === 'string' && event.key.length === 1 && /[a-zA-Z0-9:]/.test(event.key)) {
        bufferRef.current += event.key.toUpperCase();

        // Limiter la taille du buffer à 20 caractères
        if (bufferRef.current.length > 20) {
          bufferRef.current = bufferRef.current.slice(-20);
        }

        // Réinitialiser le buffer après 2 secondes d'inactivité
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 2000);

        // Vérifier les codes dans le buffer
        if (checkForCodes(bufferRef.current)) {
          bufferRef.current = '';
        }
      }
    };

    // Gestionnaire pour les événements input (mobile + desktop)
    const handleInput = (event) => {
      const target = event.target;

      // Garde de sécurité renforcée
      if (target && typeof target.tagName === 'string' && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const value = typeof target.value === 'string' ? target.value : '';

        // Vérifier si le champ contient un code
        if (checkForCodes(value)) {
          // Ne pas effacer le champ pour ne pas perturber l'utilisateur
          // La navigation se fera automatiquement
        }
      }
    };

    // Ajouter les deux écouteurs
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('input', handleInput, true); // true = capture phase

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('input', handleInput, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router]);
}
