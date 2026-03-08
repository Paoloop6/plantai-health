import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, X, ArrowRight } from "lucide-react";

export default function UpdateBanner() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("updateBannerDismissed");
    if (!dismissed && location === "/home") setVisible(true);
    else setVisible(false);
  }, [location]);

  if (!visible) return null;

  return (
    <div
      data-testid="update-banner"
      style={{
        background: "var(--c-ink)", color: "var(--c-white)",
        padding: "10px 24px",
        display: "flex", alignItems: "center", gap: 12,
        flexWrap: "wrap",
      }}
    >
      <Sparkles size={14} strokeWidth={2} color="rgba(255,255,255,0.6)" />
      <p style={{ fontFamily: "var(--f-sans)", fontSize: 13, margin: 0, flex: 1, color: "rgba(255,255,255,0.85)" }}>
        <strong style={{ color: "#fff", fontWeight: 600 }}>New:</strong> GPS tracking, Classrooms, Community Forum, and Plant Map are live.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link href="/whats-new">
          <button
            data-testid="button-see-updates"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.12)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
              fontFamily: "var(--f-sans)", fontSize: 12, fontWeight: 500,
            }}
          >
            See what's new <ArrowRight size={12} strokeWidth={2} />
          </button>
        </Link>
        <button
          onClick={() => { setVisible(false); sessionStorage.setItem("updateBannerDismissed", "1"); }}
          data-testid="button-dismiss-banner"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)", color: "#fff",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
