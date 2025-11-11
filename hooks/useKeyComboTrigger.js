import { useEffect } from 'react';

export function useKeyComboTrigger(keys, callback) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const pressedKeys = [];

      if (event.altKey) pressedKeys.push('Alt');
      if (event.ctrlKey) pressedKeys.push('Control');
      if (event.shiftKey) pressedKeys.push('Shift');
      if (event.metaKey) pressedKeys.push('Meta');

      // Ajouter la touche principale
      pressedKeys.push(event.key);

      // Vérifier si la combinaison correspond
      const sortedPressed = pressedKeys.sort();
      const sortedRequired = keys.sort();

      if (JSON.stringify(sortedPressed) === JSON.stringify(sortedRequired)) {
        event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keys, callback]);
}