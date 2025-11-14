'use client';

import { useState, useEffect } from 'react';
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission
} from '../utils/notifications';

export default function NotificationButton() {
  const [permission, setPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (areNotificationsSupported()) {
      setPermission(getNotificationPermission());
    } else {
      setPermission('unsupported');
    }
  }, []);

  const handleClick = async () => {
    if (permission === 'granted' || permission === 'denied' || permission === 'unsupported') {
      return;
    }

    setIsLoading(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setIsLoading(false);
  };

  // Don't show button if unsupported
  if (permission === 'unsupported') {
    return null;
  }

  // Show granted state
  if (permission === 'granted') {
    return (
      <button
        disabled
        className="p-2 rounded-lg bg-green-100 dark:bg-green-900 cursor-not-allowed"
        aria-label="Notifications activées"
        title="Notifications activées"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-green-600 dark:text-green-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </button>
    );
  }

  // Show denied state
  if (permission === 'denied') {
    return (
      <button
        disabled
        className="p-2 rounded-lg bg-red-100 dark:bg-red-900 cursor-not-allowed"
        aria-label="Notifications bloquées"
        title="Notifications bloquées - Réactivez-les dans les paramètres du navigateur"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-red-600 dark:text-red-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </button>
    );
  }

  // Show request button
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
      aria-label="Activer les notifications"
      title="Activer les notifications"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-700 dark:text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    </button>
  );
}
