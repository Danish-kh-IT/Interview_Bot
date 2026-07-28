import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook to manage proctoring, tab switch detection, and focus loss monitoring.
 * @param {Object} options
 * @param {boolean} options.enabled - Whether proctoring monitoring is active
 * @param {number} options.maxWarnings - Maximum warnings allowed before disqualification (default: 3)
 * @param {Function} options.onDisqualify - Callback function triggered when warnings reach maxWarnings
 * @param {Function} options.onViolation - Callback function triggered on each violation attempt
 */
export function useProctoring({
  enabled = true,
  maxWarnings = 3,
  onDisqualify,
  onViolation,
} = {}) {
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [latestReason, setLatestReason] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lastViolationTime = useRef(0);

  // Helper to trigger violation with a minimum cooldown (e.g., 2 seconds) to avoid duplicate fires
  const triggerViolation = useCallback(
    (reason) => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastViolationTime.current < 2000) return; // 2 sec cooldown
      lastViolationTime.current = now;

      setWarningCount((prev) => {
        const nextCount = prev + 1;
        setLatestReason(reason);
        setShowWarningModal(true);

        if (onViolation) {
          onViolation(nextCount, reason);
        }

        if (nextCount >= maxWarnings) {
          if (onDisqualify) {
            onDisqualify(reason);
          }
        }
        return nextCount;
      });
    },
    [enabled, maxWarnings, onDisqualify, onViolation]
  );

  // Handle Visibility Change (Tab Switch / Window Minimize)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab switch or browser minimization detected!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, triggerViolation]);

  // Handle Window Focus / Blur (Split Screen / Clicking Outside Browser)
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      triggerViolation("Lost window focus (Possible split-screen or external application usage)!");
    };

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, triggerViolation]);

  // Track Fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && enabled) {
        triggerViolation("Exited Full-Screen mode during the proctored interview!");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [enabled, triggerViolation]);

  // Prevent Copy / Cut
  useEffect(() => {
    if (!enabled) return;

    const handleCopyCut = (e) => {
      e.preventDefault();
      triggerViolation("Copying or cutting question text is strictly prohibited!");
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerViolation("Right-clicking is disabled during the interview!");
    };

    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, triggerViolation]);

  // Block Developer Tools & Unallowed Keyboard Shortcuts (F12, Ctrl+C, Ctrl+Shift+I, Ctrl+U, etc.)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // F12 (DevTools)
      if (key === "F12") {
        e.preventDefault();
        triggerViolation("Opening Developer Tools (F12) is prohibited!");
        return;
      }

      // Ctrl + Shift + I / C / J (DevTools Shortcuts)
      if (ctrl && shift && (key === "I" || key === "i" || key === "C" || key === "c" || key === "J" || key === "j")) {
        e.preventDefault();
        triggerViolation("Developer Tools keyboard shortcuts are disabled!");
        return;
      }

      // Ctrl + U (View Page Source)
      if (ctrl && (key === "u" || key === "U")) {
        e.preventDefault();
        triggerViolation("Viewing page source code is disabled!");
        return;
      }

      // Ctrl + C (Copy)
      if (ctrl && (key === "c" || key === "C")) {
        e.preventDefault();
        triggerViolation("Copy shortcut (Ctrl+C) is disabled!");
        return;
      }

      // Ctrl + V (Paste attempt)
      if (ctrl && (key === "v" || key === "V")) {
        e.preventDefault();
        triggerViolation("Paste shortcut (Ctrl+V) is disabled!");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, triggerViolation]);

  // Request Fullscreen
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed or was denied:", err);
    }
  };

  const dismissModal = () => {
    setShowWarningModal(false);
  };

  return {
    warningCount,
    maxWarnings,
    showWarningModal,
    latestReason,
    isFullscreen,
    enterFullscreen,
    dismissModal,
  };
}

