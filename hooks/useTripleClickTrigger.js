import { useEffect, useRef } from 'react';

export function useTripleClickTrigger(callback, element = null) {
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  useEffect(() => {
    const targetElement = element || document;

    const handleClick = (event) => {
      clickCountRef.current += 1;

      if (clickCountRef.current === 1) {
        clickTimerRef.current = setTimeout(() => {
          clickCountRef.current = 0;
        }, 400); // Délai pour considérer un triple-clic (400ms)
      } else if (clickCountRef.current === 3) {
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
