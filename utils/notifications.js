/**
 * Browser notification utilities
 * Handles permission requests and notification display
 */

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission() {
  if (!areNotificationsSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!areNotificationsSupported()) {
    console.warn('[Notifications] Not supported in this browser');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('[Notifications] Error requesting permission:', error);
    return 'denied';
  }
}

/**
 * Show a browser notification
 */
export async function showNotification(title, options = {}) {
  if (!areNotificationsSupported()) {
    console.warn('[Notifications] Not supported');
    return false;
  }

  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return false;
  }

  try {
    // Try to use service worker if available
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        ...options
      });
      return true;
    }

    // Fallback to direct notification
    new Notification(title, {
      icon: '/favicon.svg',
      ...options
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
    return false;
  }
}

/**
 * Show a new message notification
 */
export async function showMessageNotification(message, roomId) {
  const title = message.sentByAdmin ? 'Admin' : 'Nouveau message';
  const body = message.content || 'Image';

  return showNotification(title, {
    body: body.length > 100 ? body.substring(0, 100) + '...' : body,
    tag: `message-${roomId}`,
    data: {
      url: `/chat/${roomId}`,
      roomId: roomId,
      messageId: message.id
    }
  });
}
