import { useEffect, useRef } from "react";

interface SporeParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
}

const SPORE_COLORS = [
  "rgba(102,255,102,0.7)",
  "rgba(212,184,122,0.8)",
  "rgba(153,102,255,0.6)",
  "rgba(102,255,102,0.5)",
  "rgba(255,204,102,0.7)",
];

let sporeId = 0;

export function SporeTrail() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sporesRef = useRef<SporeParticle[]>([]);
  const lastPos = useRef({ x: -999, y: -999 });
  const throttle = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - throttle.current < 40) return;
      throttle.current = now;

      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 12) return;

      lastPos.current = { x: e.clientX, y: e.clientY };

      const count = Math.min(3, Math.floor(dist / 15) + 1);
      for (let i = 0; i < count; i++) {
        const spore: SporeParticle = {
          id: sporeId++,
          x: e.clientX + (Math.random() - 0.5) * 20,
          y: e.clientY + (Math.random() - 0.5) * 20,
          size: 3 + Math.random() * 5,
          color: SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)],
          duration: 400 + Math.random() * 400,
        };

        const el = document.createElement("div");
        el.className = "spore-trail";
        el.style.cssText = `
          left: ${spore.x - spore.size / 2}px;
          top: ${spore.y - spore.size / 2}px;
          width: ${spore.size}px;
          height: ${spore.size}px;
          background: ${spore.color};
          box-shadow: 0 0 ${spore.size * 2}px ${spore.color};
          animation-duration: ${spore.duration}ms;
        `;
        container.appendChild(el);

        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, spore.duration + 50);
      }
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
      aria-hidden="true"
    />
  );
}
