'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { api } from '@hce/api-client';

const SESSION_HINT = /(?:^|;\s*)hce_session=1(?:;|$)/;

const noopSubscribe = () => () => undefined;
const readHint = () => SESSION_HINT.test(document.cookie);
const serverHint = () => true;

export function useSessionProbe(next: string, skip: boolean): { checking: boolean } {
  const hint = useSyncExternalStore(noopSubscribe, readHint, serverHint);
  const [probeFailed, setProbeFailed] = useState(false);

  useEffect(() => {
    if (skip || !hint || !readHint()) return;
    let cancelled = false;
    api.auth
      .refresh()
      .then(() => {
        if (!cancelled) window.location.replace(next);
      })
      .catch(() => {
        if (!cancelled) setProbeFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [next, skip, hint]);

  return { checking: !skip && hint && !probeFailed };
}
