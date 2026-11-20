'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSuccessFlash(durationMs = 1600) {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const flash = useCallback(() => {
    setOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), durationMs);
  }, [durationMs]);
  return [on, flash] as const;
}
