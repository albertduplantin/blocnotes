// Stores partagés entre les différentes routes API
// Sur Vercel, utiliser un seul store car les fonctions serverless ne partagent pas global

// Store unifié : structure { roomId: { messages: [], password: '' } }
if (!global.chatStore) {
  global.chatStore = new Map();
}

export const chatStore = global.chatStore;

// Helpers pour manipuler le store
export function getMessages(roomId) {
  const room = chatStore.get(roomId);
  return room?.messages || [];
}

export function setMessages(roomId, messages) {
  const room = chatStore.get(roomId) || {};
  room.messages = messages;
  chatStore.set(roomId, room);
}

export function getPassword(roomId) {
  const room = chatStore.get(roomId);
  return room?.password || '';
}

export function setPassword(roomId, password) {
  const room = chatStore.get(roomId) || { messages: [] };
  room.password = password;
  chatStore.set(roomId, room);
}

export function getAllPasswords() {
  const passwords = {};
  for (const [roomId, room] of chatStore.entries()) {
    if (room.password) {
      passwords[roomId] = room.password;
    }
  }
  return passwords;
}
