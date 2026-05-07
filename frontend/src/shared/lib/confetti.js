/**
 * confetti.js — Dispara el efecto de confetti/serpentinas.
 * Respeta prefers-reduced-motion y no hace nada en SSR.
 */
import confetti from 'canvas-confetti';

const COLORS = ['#375f8c', '#2e8b57', '#f59e0b', '#e74c3c', '#8e44ad', '#16a085'];

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Lanza el efecto de confetti de celebración (2 rafagas desde los laterales).
 */
export function fireConfetti() {
  if (prefersReducedMotion()) return;

  const shared = {
    particleCount: 70,
    spread: 80,
    colors: COLORS,
    ticks: 200,
    gravity: 0.85,
    scalar: 1.1,
    zIndex: 99999,
  };

  // Ráfaga izquierda
  confetti({
    ...shared,
    origin: { x: 0.1, y: 0.55 },
    angle: 60,
  });

  // Ráfaga derecha
  confetti({
    ...shared,
    origin: { x: 0.9, y: 0.55 },
    angle: 120,
  });

  // Segunda oleada pequeña desde el centro-superior
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 120,
      colors: COLORS,
      ticks: 180,
      gravity: 1,
      scalar: 0.9,
      origin: { x: 0.5, y: 0.3 },
      zIndex: 99999,
    });
  }, 250);
}
