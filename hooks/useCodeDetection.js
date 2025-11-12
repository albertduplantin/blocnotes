import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useCodeDetection() {
  const router = useRouter();
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Accepter lettres, chiffres et deux-points
      if (event.key.length === 1 && /[a-zA-Z0-9:]/.test(event.key)) {
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

        // Vérifier si le buffer contient "GO:ADMIN2025"
        if (bufferRef.current.includes('GO:ADMIN2025')) {
          bufferRef.current = '';
          localStorage.setItem('isAdmin', 'true');
          router.push('/chat');
          return;
        }

        // Vérifier si le buffer contient "GO:" suivi de 6 caractères alphanumériques
        const goPattern = /GO:([A-Z0-9]{6})/;
        const match = bufferRef.current.match(goPattern);
        if (match) {
          const code = match[1]; // Extraire le code de 6 caractères
          bufferRef.current = '';
          localStorage.setItem('isAdmin', 'false');
          router.push(`/chat/${code}`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router]);
}
