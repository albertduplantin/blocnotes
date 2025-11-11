import { useEffect, useRef } from 'react';

export function useDoubleClickTrigger(callback, element = null) {
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  useEffect(() => {
    const targetElement = element || document;

    const handleClick = (event) => {
      clickCountRef.current += 1;

      if (clickCountRef.current === 1) {
        clickTimerRef.current = setTimeout(() => {
          clickCountRef.current = 0;
        }, 300); // Délai pour considérer un double-clic (300ms)
      } else if (clickCountRef.current === 2) {
        clearTimeout(clickTimerRef.current);
        clickCountRef.current = 0;
        callback(event);
      }
    };

    targetElement.addEventListener('click', handleClick);

    return () => {
      targetElement.removeEventListener('click', handleClick);
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, [callback, element]);
}