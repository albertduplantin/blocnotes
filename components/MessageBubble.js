'use client';

import { useState, useEffect } from 'react';
import { decryptMessage } from '../utils/crypto';

export function MessageBubble({ message, isSent, sharedSecret }) {
  const [decryptedContent, setDecryptedContent] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(true);

  useEffect(() => {
    if (message.content && sharedSecret) {
      decryptContent();
    } else {
      setDecryptedContent(message.content || '');
      setIsDecrypting(false);
    }
  }, [message, sharedSecret]);

  const decryptContent = async () => {
    try {
      const decrypted = await decryptMessage(message.content, message.iv, sharedSecret);
      setDecryptedContent(decrypted);
    } catch (error) {
      console.error('Erreur lors du déchiffrement:', error);
      setDecryptedContent('Erreur de déchiffrement');
    } finally {
      setIsDecrypting(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-lg ${
          isSent
            ? 'bg-green-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {isDecrypting ? (
          <div className="text-sm">Déchiffrement...</div>
        ) : (
          <div className="text-sm">{decryptedContent}</div>
        )}
        <div
          className={`text-xs mt-1 ${
            isSent ? 'text-green-100' : 'text-gray-500'
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}