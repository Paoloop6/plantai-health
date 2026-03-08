import { useEffect, useState, useRef } from "react";

interface Firefly {
  id: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  size: number;
}

interface DriftingLeaf {
  id: number;
  startX: number;
  duration: number;
  delay: number;
  size: number;
  rotation: number;
}

function FireflyDot({ firefly }: { firefly: Firefly }) {
  return (
    <div
      className="firefly"
      style={{
        left: `${firefly.x}%`,
        top: `${firefly.y}%`,
        width: `${firefly.size}px`,
        height: `${firefly.size}px`,
        animation: `firefly-orbit ${firefly.duration}s ease-in-out ${firefly.delay}s infinite`,
        position: "fixed",
        zIndex: 9997,
        pointerEvents: "none",
      }}
    />
  );
}

function LeafShape({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 8C8 10 5.9 16.17 3.82 19.26L5.71 21c1-1 2-2 3-2 4 0 6-2 6-2s-1 3-4 5c3 0 8-4 8-9 0-4-2-7-2-7s-2 1-3 3z"/>
    </svg>
  );
}

export function OrganicAnimations() {
  const [fireflies, setFireflies] = useState<Firefly[]>([]);
  const [leaves, setLeaves] = useState<DriftingLeaf[]>([]);
  const leafTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const ff: Firefly[] = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 20 + Math.random() * 50,
      duration: 8 + Math.random() * 6,
      delay: i * 2.5,
      size: 5 + Math.random() * 3,
    }));
    setFireflies(ff);

    const scheduleDrift = () => {
      if (!mountedRef.current) return;
      const delay = 12000 + Math.random() * 6000;
      leafTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        const leaf: DriftingLeaf = {
          id: Date.now(),
          startX: 10 + Math.random() * 80,
          duration: 6 + Math.random() * 4,
          delay: 0,
          size: 16 + Math.random() * 14,
          rotation: Math.random() * 360,
        };
        setLeaves(prev => [...prev.slice(-3), leaf]);
        setTimeout(() => {
          if (!mountedRef.current) return;
          setLeaves(prev => prev.filter(l => l.id !== leaf.id));
        }, (leaf.duration + 1) * 1000);
        scheduleDrift();
      }, delay);
    };

    scheduleDrift();

    return () => {
      mountedRef.current = false;
      if (leafTimerRef.current) clearTimeout(leafTimerRef.current);
    };
  }, []);

  return (
    <>
      {fireflies.map(ff => <FireflyDot key={ff.id} firefly={ff} />)}
      {leaves.map(leaf => (
        <div
          key={leaf.id}
          className="drifting-leaf"
          style={{
            left: `${leaf.startX}%`,
            top: "-30px",
            color: "var(--leaf-spring)",
            animationDuration: `${leaf.duration}s`,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          <LeafShape size={leaf.size} />
        </div>
      ))}
    </>
  );
}

export function PollenBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * 360;
        const dist = 30 + Math.random() * 20;
        const tx = Math.cos((angle * Math.PI) / 180) * dist;
        const ty = Math.sin((angle * Math.PI) / 180) * dist;
        return (
          <div
            key={i}
            className="pollen-particle"
            style={{
              left: x,
              top: y,
              position: "fixed",
              zIndex: 99999,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              animationDelay: `${i * 30}ms`,
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}
