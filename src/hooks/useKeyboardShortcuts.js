import { useEffect } from 'react';
import { useSimStore } from '../store/useSimStore';

/**
 * Global keyboard shortcut handler for the simulation dashboard.
 *
 * Space    → Pause / Resume
 * +/=      → Speed up
 * -        → Speed down
 * M        → Toggle metrics panel
 * S        → Open special train modal
 * R        → Reset simulation (with confirm)
 * 1        → Rush level BASIC
 * 2        → Rush level MODERATE
 * 3        → Rush level EXTREME
 * ?        → Toggle shortcuts help
 * Escape   → Close drawers / modals
 */
export function useKeyboardShortcuts(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const SPEEDS = [1, 2, 5, 10];

    const handler = (e) => {
      // Don't fire when user is typing in an input
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      const {
        paused, setPaused, speed, setSpeed,
        rushLevel, setRushLevel,
        toggleMetrics, openSpecialModal, resetSimulation,
        toggleShortcuts,
        selectedElement, clearSelected,
        settingsOpen, toggleSettings,
        specialTrainModalOpen, closeSpecialModal,
        eventLogOpen, toggleEventLog,
      } = useSimStore.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPaused(!paused);
          break;

        case '+':
        case '=': {
          const idx = SPEEDS.indexOf(speed);
          if (idx < SPEEDS.length - 1) setSpeed(SPEEDS[idx + 1]);
          break;
        }

        case '-':
        case '_': {
          const idx = SPEEDS.indexOf(speed);
          if (idx > 0) setSpeed(SPEEDS[idx - 1]);
          break;
        }

        case 'm':
        case 'M':
          toggleMetrics();
          break;

        case 's':
        case 'S':
          if (!specialTrainModalOpen) openSpecialModal();
          break;

        case 'r':
        case 'R':
          if (window.confirm('Reset simulation? All progress will be lost.')) {
            resetSimulation();
          }
          break;

        case '1':
          setRushLevel('basic');
          break;
        case '2':
          setRushLevel('moderate');
          break;
        case '3':
          setRushLevel('extreme');
          break;

        case '?':
          toggleShortcuts();
          break;

        case 'l':
        case 'L':
          toggleEventLog();
          break;

        case 'Escape':
          if (specialTrainModalOpen) closeSpecialModal();
          else if (settingsOpen) toggleSettings();
          else if (selectedElement) clearSelected();
          else if (eventLogOpen) toggleEventLog();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
