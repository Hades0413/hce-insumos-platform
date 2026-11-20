type Update = () => void | Promise<void>;

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
}

const ignore = () => undefined;

export function canUseViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function' &&
    document.visibilityState === 'visible' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export async function runViewTransition(update: Update): Promise<void> {
  if (!canUseViewTransition()) {
    await update();
    return;
  }
  let transition: ViewTransitionLike;
  try {
    transition = (
      document as Document & {
        startViewTransition: (cb: Update) => ViewTransitionLike;
      }
    ).startViewTransition(update);
  } catch {
    await update();
    return;
  }
  transition.ready.catch(ignore);
  transition.finished.catch(ignore);
  await transition.updateCallbackDone.catch(ignore);
}
