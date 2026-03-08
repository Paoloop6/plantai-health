import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camera, Leaf, GraduationCap, MessageSquare, Map, BookOpen, Droplet, Users, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  { icon: Camera,        title: "AI Identification",       desc: "Snap a photo and instantly identify any plant with confidence scores." },
  { icon: Map,           title: "GPS Location Tracking",   desc: "Capture exactly where you found each plant on an interactive map." },
  { icon: GraduationCap, title: "Classroom Management",    desc: "Create classes, share join codes, assign activities, and grade students." },
  { icon: MessageSquare, title: "Community Forum",         desc: "Share discoveries, ask questions, and connect with plant enthusiasts." },
  { icon: Droplet,       title: "Watering Reminders",      desc: "Personalised care reminders based on each plant's specific needs." },
  { icon: BookOpen,      title: "Educational Content",     desc: "Learn about plant ecology, history, and cultural significance." },
  { icon: Users,         title: "Collaborative Learning",  desc: "Work together on shared plant collections and research projects." },
  { icon: Sparkles,      title: "AI Plant Chatbot",        desc: "Ask any plant care question and get expert AI-powered answers." },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [joinCode, setJoinCode] = useState("");
  const { isAuthenticated } = useAuth();

  const { data: userStats } = useQuery<{ count: number }>({ queryKey: ["/api/stats/users"] });
  const { data: plantStats } = useQuery<{ count: number }>({ queryKey: ["/api/stats/plants"] });

  const incrementVisit = useMutation({ mutationFn: () => fetch("/api/stats/visitors/increment", { method: "POST" }) });
  useEffect(() => { incrementVisit.mutate(); }, []);

  useEffect(() => {
    if (isAuthenticated) setLocation("/home");
  }, [isAuthenticated]);

  const handleJoin = () => {
    if (joinCode.trim()) setLocation(`/identify?code=${joinCode.trim().toUpperCase()}`);
  };

  const F = "var(--f-sans)";

  return (
    <div style={{ background: "#FAFAFA", minHeight: "100vh", fontFamily: F }}>

      {/* ── Nav ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(250,250,250,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E5E5",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 24px", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Leaf size={14} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", letterSpacing: "-0.02em" }}>
            PlantCare
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/login">
          <button style={{
            padding: "7px 18px", borderRadius: 999,
            background: "transparent", color: "#1A1A1A",
            border: "1px solid #D1D5DB", cursor: "pointer",
            fontSize: 13, fontWeight: 500, fontFamily: F,
            marginRight: 8,
          }}>
            Sign in
          </button>
        </Link>
        <Link href="/login">
          <button style={{
            padding: "7px 18px", borderRadius: 999,
            background: "#1A1A1A", color: "#fff",
            border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: F,
          }}>
            Get started
          </button>
        </Link>
      </header>

      {/* ── Hero ── */}
      <section style={{
        maxWidth: 780, margin: "0 auto",
        padding: "96px 24px 80px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 999,
          background: "#fff", border: "1px solid #E5E5E5",
          marginBottom: 32,
        }}>
          <Sparkles size={12} strokeWidth={2} color="#6B6B6B" />
          <span style={{ fontSize: 12, fontWeight: 500, color: "#6B6B6B", letterSpacing: "0.01em" }}>
            GPT-4o Vision · Powered by AI
          </span>
        </div>

        <h1 className="t-h0" style={{ color: "#1A1A1A", marginBottom: 24 }}>
          Identify any plant<br />
          <span style={{ color: "#6B6B6B" }}>in seconds.</span>
        </h1>

        <p style={{
          fontSize: 18, lineHeight: 1.65, color: "#6B6B6B",
          maxWidth: 520, margin: "0 auto 40px",
        }}>
          An AI-powered educational tool for teachers and students. Point your camera at any plant and get instant identification, care instructions, and educational content.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login">
            <button
              data-testid="button-get-started"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 32px", borderRadius: 999,
                background: "#1A1A1A", color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 15, fontWeight: 600, fontFamily: F,
                letterSpacing: "-0.01em",
                transition: "transform 0.2s, box-shadow 0.2s",
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
              Get started free
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </Link>
          <Link href="/login">
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px", borderRadius: 999,
              background: "#fff", color: "#1A1A1A",
              border: "1px solid #D1D5DB", cursor: "pointer",
              fontSize: 15, fontWeight: 500, fontFamily: F,
              letterSpacing: "-0.01em",
            }}>
              Sign in
            </button>
          </Link>
        </div>

        {/* Stats */}
        {(userStats?.count || plantStats?.count) ? (
          <div style={{
            display: "flex", gap: 32, justifyContent: "center",
            marginTop: 56, flexWrap: "wrap",
          }}>
            {userStats?.count ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.03em", margin: 0 }}>{userStats.count.toLocaleString()}+</p>
                <p style={{ fontSize: 12, color: "#A8A8A8", margin: "2px 0 0", fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>Students & teachers</p>
              </div>
            ) : null}
            {plantStats?.count ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.03em", margin: 0 }}>{plantStats.count.toLocaleString()}+</p>
                <p style={{ fontSize: 12, color: "#A8A8A8", margin: "2px 0 0", fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>Plants identified</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "#E5E5E5", maxWidth: 1100, margin: "0 auto" }} />

      {/* ── Features ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="t-eyebrow" style={{ marginBottom: 14 }}>Everything you need</p>
          <h2 className="t-h1" style={{ color: "#1A1A1A", marginBottom: 0 }}>
            Built for classrooms,<br />designed for everyone.
          </h2>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                padding: "24px",
                background: "#fff",
                border: "1px solid #E5E5E5",
                borderRadius: 20,
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "default",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.07)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "#F1F5F9",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <Icon size={19} strokeWidth={1.75} color="#1A1A1A" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                {title}
              </p>
              <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.55 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Join class ── */}
      <div style={{ height: 1, background: "#E5E5E5", maxWidth: 1100, margin: "0 auto" }} />
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#1A1A1A", marginBottom: 10 }}>
          Have a class code?
        </h2>
        <p style={{ color: "#6B6B6B", marginBottom: 28, fontSize: 15 }}>
          Enter your teacher's code to join their class and start identifying plants.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={6}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            data-testid="input-join-code"
            style={{
              width: 160, padding: "12px 16px", borderRadius: 999,
              border: "1px solid #D1D5DB", background: "#fff",
              fontSize: 14, fontFamily: F, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              outline: "none",
            }}
          />
          <button
            onClick={handleJoin}
            data-testid="button-join-class"
            style={{
              padding: "12px 24px", borderRadius: 999,
              background: "#1A1A1A", color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600, fontFamily: F,
            }}
          >
            Join class
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #E5E5E5", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Leaf size={11} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", letterSpacing: "-0.01em" }}>PlantCare</span>
          </div>
          <p style={{ fontSize: 12, color: "#A8A8A8", margin: 0 }}>
            AI-powered plant identification for education.
          </p>
        </div>
      </footer>
    </div>
  );
}
