'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import QRCode from 'qrcode.react';
import { generateKeyPair, deriveSharedSecret } from '../utils/crypto';

export function QRPairing({ onPair }) {
  const { user } = useUser();
  const [publicKey, setPublicKey] = useState('');
  const [scannedData, setScannedData] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateKeys();
  }, []);

  const generateKeys = async () => {
    try {
      const keyPair = await generateKeyPair();
      const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));

      setPublicKey(publicKeyBase64);

      // Sauvegarder la clé privée dans IndexedDB (non extractable)
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      store.put({ id: 'privateKey', value: keyPair.privateKey });

      setIsGenerating(false);
    } catch (error) {
      console.error('Erreur lors de la génération des clés:', error);
    }
  };

  const handleScan = async () => {
    if (!scannedData.trim()) return;

    try {
      // Parser les données scannées (format: userId:publicKey)
      const [contactUserId, contactPublicKeyBase64] = scannedData.split(':');

      // Importer la clé publique du contact
      const contactPublicKeyBuffer = Uint8Array.from(atob(contactPublicKeyBase64), c => c.charCodeAt(0));
      const contactPublicKey = await crypto.subtle.importKey(
        'spki',
        contactPublicKeyBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // Générer le secret partagé
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const request = store.get('privateKey');

      request.onsuccess = async () => {
        const privateKey = request.result.value;
        const sharedSecret = await deriveSharedSecret(privateKey, contactPublicKey);

        // Sauvegarder le secret partagé
        const writeTransaction = db.transaction(['keys'], 'readwrite');
        const writeStore = writeTransaction.objectStore('keys');
        writeStore.put({ id: 'sharedSecret', value: sharedSecret });

        onPair(contactPublicKey);
      };
    } catch (error) {
      console.error('Erreur lors du scan:', error);
    }
  };

  const openDB = (name, version) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      };
    });
  };


  if (isGenerating) {
    return <div className="text-center">Génération des clés...</div>;
  }

  const qrData = `${user.id}:${publicKey}`;

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-4">Appairage</h2>
      <p className="mb-4">Faites scanner ce QR code par votre contact</p>
      <div className="mb-6 inline-block p-4 bg-white rounded-lg shadow">
        <QRCode value={qrData} size={200} />
      </div>
      <div className="mb-4">
        <p className="mb-2">Ou saisissez manuellement les données du QR :</p>
        <input
          type="text"
          value={scannedData}
          onChange={(e) => setScannedData(e.target.value)}
          placeholder="userId:publicKey"
          className="w-full p-2 border border-gray-300 rounded mb-2"
        />
        <button
          onClick={handleScan}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Appairer
        </button>
      </div>
    </div>
  );
}