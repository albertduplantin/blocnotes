'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Toujours aller vers /notes par défaut
    router.push('/notes');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">SecureNotes</h1>
        <p>Chargement...</p>
      </div>
    </div>
  );
}

