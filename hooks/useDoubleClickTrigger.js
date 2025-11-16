import { useRef } from 'react';

/**
 * A hook that returns an onClick handler to differentiate between single and double clicks.
 *
 * @param {function} onClick - The callback to execute on a single click.
 * @param {function} onDoubleClick - The callback to execute on a double-click.
 * @param {number} [timeout=300] - The time in ms to wait for a second click.
 * @returns {function} - A single onClick handler to attach to a component.
 */
export function useDoubleClickTrigger(onClick, onDoubleClick, timeout = 250) {
  const clickTimeout = useRef(null);

  const handler = (event) => {
    if (!clickTimeout.current) {
      // This is the first click
      clickTimeout.current = setTimeout(() => {
        // Timeout expired, perform single click action
        if (onClick) {
          onClick(event);
        }
        clickTimeout.current = null;
      }, timeout);
    } else {
      // This is the second click within the timeout (a double click)
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      if (onDoubleClick) {
        onDoubleClick(event);
      }
    }
  };

  return handler;
}