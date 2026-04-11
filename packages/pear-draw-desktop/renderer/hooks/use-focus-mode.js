import { createSignal, onCleanup, onMount } from "solid-js";

/**
 * useFocusMode — manages canvas focus/zen mode that hides UI after idle timeout.
 *
 * The toolbar and header slide off the screen when the user is idle,
 * creating an immersive drawing experience. Press H to manually toggle.
 *
 * @param {() => boolean} isConnected — reactive signal indicating connection status
 * @param {() => boolean} canOpenConnectionMenu — reactive signal; when true, idle timer is disabled
 * @returns {{ isFocusMode: () => boolean, resetIdleTimer: () => void }}
 */
export function useFocusMode(isConnected, canOpenConnectionMenu) {
  const [isFocusMode, setIsFocusMode] = createSignal(false);
  let idleTimer = null;

  const resetIdleTimer = () => {
    // Don't override focus mode if connection modal is about to show
    if (canOpenConnectionMenu()) return;
    setIsFocusMode(false);
    if (idleTimer) clearTimeout(idleTimer);
    if (isConnected()) {
      idleTimer = setTimeout(() => {
        setIsFocusMode(true);
      }, 2000);
    }
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode());
    if (idleTimer) clearTimeout(idleTimer);
    if (!isFocusMode() && isConnected()) {
      idleTimer = setTimeout(() => setIsFocusMode(true), 2000);
    }
  };

  onMount(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === "h") {
        toggleFocusMode();
      } else {
        resetIdleTimer();
      }
    };
    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keydown", handleKeyDown);
      if (idleTimer) clearTimeout(idleTimer);
    });
  });

  return { isFocusMode, resetIdleTimer };
}