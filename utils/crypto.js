// Fonctions de chiffrement utilisant Web Crypto API

// Générer une paire de clés ECDH P-256
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable pour la clé publique
    ['deriveKey', 'deriveBits']
  );

  return keyPair;
}

// Dériver le secret partagé à partir des clés privées et publiques
export async function deriveSharedSecret(privateKey, publicKey) {
  const sharedSecret = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // non extractable
    ['encrypt', 'decrypt']
  );

  return sharedSecret;
}

// Chiffrer un message avec AES-GCM
export async function encryptMessage(message, sharedSecret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Générer un IV aléatoire
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedSecret,
    data
  );

  return {
    content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Déchiffrer un message avec AES-GCM
export async function decryptMessage(encryptedContent, ivBase64, sharedSecret) {
  try {
    const encryptedData = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sharedSecret,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erreur de déchiffrement:', error);
    throw new Error('Impossible de déchiffrer le message');
  }
}

// Générer une clé AES-GCM pour le stockage local (non utilisée dans le chat)
export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Chiffrer des données avec une clé AES (pour stockage local)
export async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Déchiffrer des données avec une clé AES (pour stockage local)
export async function decryptData(encryptedData, iv, key) {
  try {
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (error) {
    console.error('Erreur de déchiffrement des données:', error);
    throw new Error('Impossible de déchiffrer les données');
  }
}