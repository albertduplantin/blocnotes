import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useCodeDetection() {
  const router = useRouter();
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ajouter le caractère au buffer (seulement lettres et chiffres)
      if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
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

        // Vérifier si le buffer contient le code admin (ADMIN2025)
        if (bufferRef.current.includes('ADMIN2025')) {
          bufferRef.current = '';
          localStorage.setItem('isAdmin', 'true');
          router.push('/chat');
          return;
        }

        // Vérifier si les 6 derniers caractères forment un code valide
        // (6 caractères alphanumériques majuscules)
        if (bufferRef.current.length >= 6) {
          const lastSix = bufferRef.current.slice(-6);
          // Pattern: 6 caractères alphanumériques
          if (/^[A-Z0-9]{6}$/.test(lastSix)) {
            bufferRef.current = '';
            localStorage.setItem('isAdmin', 'false');
            router.push(`/chat/${lastSix}`);
          }
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
