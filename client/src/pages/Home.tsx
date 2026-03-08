import { Link } from "wouter";
import { Camera, Leaf, GraduationCap, MessageSquare, Map, Bell, Bot, BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Plant } from "@shared/schema";

const QUICK_LINKS = [
  { href: "/identify",  icon: Camera,        label: "Identify a Plant",  desc: "Scan with AI" },
  { href: "/app",       icon: Leaf,          label: "My Plants",         desc: "Your collection" },
  { href: "/chatbot",   icon: Bot,           label: "AI Chatbot",        desc: "Ask anything" },
  { href: "/map",       icon: Map,           label: "Plant Map",         desc: "See locations" },
  { href: "/classes",   icon: GraduationCap, label: "Classrooms",        desc: "Join & learn" },
  { href: "/forum",     icon: MessageSquare, label: "Community",         desc: "Discuss plants" },
  { href: "/reminders", icon: Bell,          label: "Reminders",         desc: "Watering schedule" },
  { href: "/whats-new", icon: Sparkles,      label: "What's New",        desc: "Latest updates", badge: "New" },
];

export default function Home() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const { data: plants } = useQuery<Plant[]>({ queryKey: ["/api/plants"] });
  const plantCount = plants?.length ?? 0;
  const firstName = (user?.displayName || user?.username || "").split(" ")[0];

  return (
    <div style={{ background: "var(--c-bg)", minHeight: "calc(100vh - 56px)" }}>
      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* Greeting */}
        <div style={{ marginBottom: 40 }} className="animate-fade-up">
          <p className="t-eyebrow" style={{ marginBottom: 8 }}>Welcome back</p>
          <h1 style={{ color: "var(--c-ink)", marginBottom: 8 }}>
            {firstName ? `Hey, ${firstName}` : "Your Garden"}
          </h1>
          <p style={{ fontSize: 16, color: "var(--c-ink-2)", maxWidth: 480 }}>
            {plantCount > 0
              ? `You have ${plantCount} plant${plantCount === 1 ? "" : "s"} in your collection.`
              : "Start by identifying your first plant."}
          </p>
        </div>

        {/* Primary CTA */}
        <div style={{ marginBottom: 48 }} className="animate-fade-up animation-delay-100">
          <Link href="/identify">
            <button
              data-testid="button-identify-plant"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "14px 28px",
                background: "var(--c-black)", color: "var(--c-white)",
                border: "none", borderRadius: "var(--r-pill)",
                fontFamily: "var(--f-sans)", fontSize: 15, fontWeight: 600,
                letterSpacing: "-0.01em", cursor: "pointer",
                transition: "transform 0.2s var(--ease), box-shadow 0.2s var(--ease)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <Camera size={17} strokeWidth={2} />
              Identify a Plant
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          </Link>
        </div>

        {/* Stats row */}
        {plantCount > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap" }} className="animate-fade-up animation-delay-200">
            {[
              { label: "Plants identified", value: plantCount },
              { label: "Role", value: isTeacher ? "Teacher" : "Student" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: "16px 24px",
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--r-lg)",
                minWidth: 140,
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-ink-3)", marginBottom: 4, fontFamily: "var(--f-sans)" }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--c-ink)", letterSpacing: "-0.02em", fontFamily: "var(--f-sans)", margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick links grid */}
        <div style={{ marginBottom: 16 }}>
          <p className="t-micro" style={{ color: "var(--c-ink-3)", marginBottom: 16 }}>Quick Access</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {QUICK_LINKS.filter(l => {
              if (l.href === "/classes" || l.href === "/reminders") return true;
              return true;
            }).map(({ href, icon: Icon, label, desc, badge }, i) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div
                  data-testid={`card-quicklink-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`animate-fade-up animation-delay-${Math.min((i + 3) * 100, 800)}`}
                  style={{
                    padding: "20px",
                    background: "var(--c-surface)",
                    border: "1px solid var(--c-border)",
                    borderRadius: "var(--r-lg)",
                    cursor: "pointer",
                    transition: "transform 0.2s var(--ease), box-shadow 0.2s var(--ease), border-color 0.2s",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = "var(--shadow-raised)";
                    el.style.borderColor = "var(--c-border-2)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "";
                    el.style.boxShadow = "";
                    el.style.borderColor = "";
                  }}
                >
                  {badge && (
                    <span style={{
                      position: "absolute", top: 12, right: 12,
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "2px 6px", borderRadius: 999,
                      background: "var(--c-ink)", color: "var(--c-white)",
                    }}>
                      {badge}
                    </span>
                  )}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: "var(--c-hover)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 14,
                  }}>
                    <Icon size={18} strokeWidth={1.75} color="var(--c-ink)" />
                  </div>
                  <p style={{ fontFamily: "var(--f-sans)", fontSize: 14, fontWeight: 600, color: "var(--c-ink)", margin: "0 0 3px", letterSpacing: "-0.01em" }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: "var(--f-sans)", fontSize: 12, color: "var(--c-ink-3)", margin: 0 }}>
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Teacher Hub shortcut */}
        {isTeacher && (
          <div style={{ marginTop: 32 }} className="animate-fade-up animation-delay-500">
            <Link href="/teacher" style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 24px",
                background: "var(--c-ink)",
                borderRadius: "var(--r-lg)",
                cursor: "pointer",
                transition: "transform 0.2s var(--ease)",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = "translateY(-1px)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = "")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <BarChart3 size={20} strokeWidth={1.75} color="rgba(255,255,255,0.7)" />
                  <div>
                    <p style={{ fontFamily: "var(--f-sans)", fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 2px", letterSpacing: "-0.01em" }}>Teacher Hub</p>
                    <p style={{ fontFamily: "var(--f-sans)", fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>Manage classes and analytics</p>
                  </div>
                </div>
                <ArrowRight size={16} strokeWidth={2} color="rgba(255,255,255,0.4)" />
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
