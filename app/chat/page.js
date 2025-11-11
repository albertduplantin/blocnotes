'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { QRPairing } from '../../components/QRPairing';
import { MessageBubble } from '../../components/MessageBubble';
import { PanicWrapper } from '../../components/PanicWrapper';
import { encryptMessage, decryptMessage, deriveSharedSecret } from '../../utils/crypto';

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const [sharedSecret, setSharedSecret] = useState(null);
  const [contactPublicKey, setContactPublicKey] = useState(null);
  const messagesEndRef = useRef(null);

  // Charger les messages depuis IndexedDB
  useEffect(() => {
    loadMessages();
    checkPairingStatus();
  }, []);

  // Faire défiler vers le bas lors de nouveaux messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();

      request.onsuccess = () => {
        setMessages(request.result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      };
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const checkPairingStatus = async () => {
    try {
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const request = store.get('sharedSecret');

      request.onsuccess = () => {
        if (request.result) {
          setSharedSecret(request.result.value);
          setIsPaired(true);
        }
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du pairing:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sharedSecret) return;

    try {
      const encrypted = await encryptMessage(newMessage, sharedSecret);
      const message = {
        id: Date.now(),
        content: encrypted.content,
        iv: encrypted.iv,
        timestamp: new Date().toISOString(),
        isSent: true,
      };

      // Sauvegarder dans IndexedDB
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      store.add(message);

      setMessages([...messages, message]);
      setNewMessage('');

      // Envoyer au serveur (simulé)
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedContent: encrypted.content,
          iv: encrypted.iv,
          receiverId: 'contact-id', // À remplacer par l'ID réel
        }),
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const handlePairing = async (contactKey) => {
    try {
      // Générer la clé partagée
      const privateKey = await loadPrivateKey();
      const secret = await deriveSharedSecret(privateKey, contactKey);

      // Sauvegarder la clé partagée
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      store.put({ id: 'sharedSecret', value: secret });

      setSharedSecret(secret);
      setContactPublicKey(contactKey);
      setIsPaired(true);
    } catch (error) {
      console.error('Erreur lors du pairing:', error);
    }
  };

  const loadPrivateKey = async () => {
    try {
      const db = await openDB('chat', 1);
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const request = store.get('privateKey');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la clé privée:', error);
      return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openDB = (name, version) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      };
    });
  };

  if (!isPaired) {
    return (
      <PanicWrapper>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold mb-4 text-center">SecureNotes</h1>
            <p className="text-center mb-6">Scannez le QR code pour vous connecter</p>
            <QRPairing onPair={handlePairing} />
          </div>
        </div>
      </PanicWrapper>
    );
  }

  return (
    <PanicWrapper>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-green-500 text-white p-4 flex items-center">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Contact</h1>
            <p className="text-sm opacity-75">En ligne</p>
          </div>
          <button
            onClick={() => {
              // Mode panique
              localStorage.clear();
              indexedDB.deleteDatabase('chat');
              window.location.href = '/notes';
            }}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Déconnexion
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isSent={message.isSent}
              sharedSecret={sharedSecret}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white p-4 flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tapez un message..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-green-500 text-white rounded-r-lg hover:bg-green-600"
          >
            Envoyer
          </button>
        </div>
      </div>
    </PanicWrapper>
  );
}