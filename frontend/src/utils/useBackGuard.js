import { useEffect, useRef } from 'react';

// Make the back gesture (browser edge-swipe, Android system back) mean
// "close the topmost popup / go back a level" instead of leaving the page or
// exiting the app.
//
// How: when an overlay opens we push a throwaway history entry. A back gesture
// pops that entry (fires `popstate`) and we run the overlay's close handler
// rather than navigating away. Closing via a button/backdrop instead consumes
// the pushed entry with history.back() so history never accumulates.
//
// Works the same on web and Capacitor Android: both deliver the back gesture
// through window history, so guarding history guards them both. No @capacitor
// plugin needed.

const stack = []; // { close } entries, topmost last
let ignorePops = 0; // pops we triggered ourselves (programmatic close)
let listening = false;

function onPopState() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  const entry = stack.pop();
  if (entry) entry.close(); // its guard state was just consumed by this back
}

// Push a guard entry: a back gesture pops it and runs onClose instead of
// leaving the page / exiting the app. Returns a disposer that removes the
// guard and consumes its history entry (for programmatic close via button).
export function pushBackGuard(onClose) {
  if (!listening) {
    window.addEventListener('popstate', onPopState);
    listening = true;
  }
  const entry = { close: onClose };
  stack.push(entry);
  window.history.pushState({ backGuard: true }, '');

  return () => {
    const i = stack.indexOf(entry);
    if (i === -1) return; // already popped by a back gesture
    stack.splice(i, 1);
    ignorePops++;
    window.history.back();
  };
}

export function useBackGuard(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    return pushBackGuard(() => onCloseRef.current && onCloseRef.current());
  }, [isOpen]);
}
