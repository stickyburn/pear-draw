// ─────────────────────────────────────────────────────────────────
// Keyframe Animations — Tokyo Midnight Creative Studio.
// Extracted from studio-theme.jsx for maintainability.
// ─────────────────────────────────────────────────────────────────

import { studio } from "./studio-theme.jsx";

export const keyframes = `
@keyframes studio-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes studio-scale-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
@keyframes studio-slide-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes studio-slide-down { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes studio-pulse-glow { 0%, 100% { box-shadow: 0 0 15px ${studio.neon.violet}30; } 50% { box-shadow: 0 0 25px ${studio.neon.violet}50; } }
@keyframes studio-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes studio-breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }

/* Cursor lifecycle animations */
@keyframes cursor-appear {
  0% { opacity: 0; transform: scale(0.3) translate(-2px, -2px); }
  60% { opacity: 1; transform: scale(1.1) translate(-2px, -2px); }
  100% { opacity: 1; transform: scale(1) translate(-2px, -2px); }
}
@keyframes cursor-glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 6px var(--cursor-color)); }
  50% { filter: drop-shadow(0 0 12px var(--cursor-color)); }
}
@keyframes cursor-ripple {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes cursor-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
}
`;
