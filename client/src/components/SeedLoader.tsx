import { useEffect, useState } from "react";

export function SeedLoader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timings = [400, 900, 1500, 2100, 2700, 3200];
    const timers = timings.map((t, i) =>
      setTimeout(() => setPhase(i + 1), t)
    );
    const done = setTimeout(onComplete, 3400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div
      className="seed-loader"
      style={{
        background: "linear-gradient(180deg, #050a06 0%, #0d1a0f 100%)",
      }}
      aria-label="Loading PlantCare"
      role="status"
    >
      <div className="relative flex flex-col items-center gap-6">
        {/* Root SVG network - phase 2+ */}
        <svg
          width="200"
          height="120"
          viewBox="0 0 200 120"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: phase >= 2 ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          <path
            d="M100 60 Q80 80 60 90 Q40 100 20 110"
            stroke="rgba(107,142,35,0.6)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 120,
              strokeDashoffset: phase >= 2 ? 0 : 120,
              transition: "stroke-dashoffset 0.8s ease",
            }}
          />
          <path
            d="M100 60 Q120 80 140 90 Q160 100 180 108"
            stroke="rgba(107,142,35,0.6)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 120,
              strokeDashoffset: phase >= 2 ? 0 : 120,
              transition: "stroke-dashoffset 0.8s 0.2s ease",
            }}
          />
          <path
            d="M100 60 Q95 80 90 100"
            stroke="rgba(107,142,35,0.5)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 60,
              strokeDashoffset: phase >= 2 ? 0 : 60,
              transition: "stroke-dashoffset 0.6s 0.4s ease",
            }}
          />
        </svg>

        {/* Vine / stem growing up - phase 3+ */}
        <svg
          width="4"
          height={phase >= 3 ? 80 : 0}
          viewBox="0 0 4 80"
          style={{
            position: "absolute",
            bottom: "calc(50% + 16px)",
            transition: "height 0.7s cubic-bezier(0.34,1.56,0.64,1)",
            overflow: "visible",
          }}
        >
          <path
            d="M2 80 Q1 60 2 40 Q3 20 2 0"
            stroke="rgba(74,124,89,0.9)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Central seed */}
        <div
          className="relative"
          style={{
            width: 28,
            height: 38,
            background: "radial-gradient(ellipse at 40% 35%, #c8a96e 0%, #6b4c1e 100%)",
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            boxShadow: phase >= 1
              ? "0 0 24px 8px rgba(218,165,32,0.5), 0 0 60px 20px rgba(218,165,32,0.15)"
              : "none",
            transition: "box-shadow 0.6s ease",
            animation: phase >= 1 ? "seed-crack 0.6s ease-out forwards" : "none",
            zIndex: 10,
          }}
        />

        {/* Leaf crown - phase 4+ */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? "scale(1)" : "scale(0)",
            transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s",
          }}
        >
          <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
            <path
              d="M30 38 C30 38 10 30 10 15 C10 5 20 0 30 0 C40 0 50 5 50 15 C50 30 30 38 30 38Z"
              fill="rgba(74,124,89,0.9)"
            />
            <path d="M30 0 C30 0 15 8 15 20" stroke="rgba(107,142,35,0.7)" strokeWidth="1" fill="none" />
            <path d="M30 0 C30 0 45 8 45 20" stroke="rgba(107,142,35,0.7)" strokeWidth="1" fill="none" />
            <path d="M30 0 L30 30" stroke="rgba(107,142,35,0.5)" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Pollen trail - phase 5+ */}
        {phase >= 5 && (
          <div style={{ position: "absolute", inset: -60, pointerEvents: "none" }}>
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i / 8) * 360;
              const r = 50 + Math.random() * 30;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#daa520",
                    boxShadow: "0 0 6px 2px rgba(218,165,32,0.6)",
                    left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * r}px)`,
                    top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * r}px)`,
                    animation: `pollen-burst 0.8s ${i * 80}ms ease-out both`,
                    "--tx": `${Math.cos((angle * Math.PI) / 180) * 20}px`,
                    "--ty": `${Math.sin((angle * Math.PI) / 180) * 20}px`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Brand text */}
      <div
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s ease",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--f-sans)",
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--c-ink)",
            letterSpacing: "0.05em",
          }}
        >
          PlantCare
        </p>
        <p
          style={{
            fontFamily: "var(--f-sans)",
            fontSize: "0.9rem",
            color: "var(--c-ink-3)",
            letterSpacing: "0.15em",
          }}
        >
          growing your knowledge
        </p>
      </div>
    </div>
  );
}
