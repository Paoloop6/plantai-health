import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Camera, Leaf, GraduationCap, MessageSquare,
  Map, Sparkles, User, BarChart3, Bell, Bot, LogOut, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";

const FONT = "var(--f-sans)";
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  requiresAuth?: boolean;
  teacherOnly?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/home",      label: "Home",        icon: Home },
  { href: "/identify",  label: "Identify",    icon: Camera },
  { href: "/app",       label: "My Plants",   icon: Leaf },
  { href: "/chatbot",   label: "AI Chatbot",  icon: Bot },
  { href: "/map",       label: "Plant Map",   icon: Map },
  { href: "/classes",   label: "Classrooms",  icon: GraduationCap, requiresAuth: true },
  { href: "/forum",     label: "Community",   icon: MessageSquare },
  { href: "/whats-new", label: "What's New",  icon: Sparkles, badge: "New" },
  { href: "/reminders", label: "Reminders",   icon: Bell, requiresAuth: true },
  { href: "/teacher",   label: "Teacher Hub", icon: BarChart3, requiresAuth: true, teacherOnly: true },
];

const HIDE_SIDEBAR = ["/", "/login", "/select-role", "/welcome"];

export default function AppSidebar() {
  const [location] = useLocation();
  const { isOpen, toggle } = useSidebar();
  const { user, isAuthenticated, logout } = useAuth();
  const isTeacher = user?.role === "teacher";

  /* Close drawer on route change */
  useEffect(() => {
    if (isOpen) toggle();
  }, [location]);

  if (HIDE_SIDEBAR.includes(location)) return null;
  if (!isOpen) return null;

  const filteredItems = navItems.filter(item => {
    if (item.teacherOnly && !isTeacher) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  const initials = user
    ? ((user.displayName || user.username) ?? "?").slice(0, 2).toUpperCase()
    : "";

  return (
    <>
      {/* Overlay */}
      <div
        className="drawer-overlay"
        onClick={toggle}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav className="nav-drawer" data-testid="sidebar">
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--c-border)",
        }}>
          <Link href="/home" onClick={toggle}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#1A1A1A",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Leaf size={16} color="#FFFFFF" strokeWidth={2} />
              </div>
              <span style={{
                fontFamily: FONT, fontWeight: 700, fontSize: 16,
                color: "var(--c-ink)", letterSpacing: "-0.02em",
              }}>
                PlantCare
              </span>
            </div>
          </Link>
          <button
            onClick={toggle}
            data-testid="button-sidebar-close"
            aria-label="Close menu"
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--c-border)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--c-ink-2)",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: "12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: isActive ? "var(--c-black)" : "transparent",
                    cursor: "pointer",
                    transition: `background 0.15s ${EASE}`,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--c-hover)";
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span style={{
                    fontFamily: FONT, fontSize: 14, fontWeight: isActive ? 600 : 450,
                    color: isActive ? "var(--c-white)" : "var(--c-ink)",
                    letterSpacing: "-0.01em", flex: 1,
                  }}>
                    {label}
                  </span>
                  {badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
                      padding: "2px 6px", borderRadius: 999,
                      background: isActive ? "rgba(255,255,255,0.2)" : "var(--c-ink)",
                      color: isActive ? "var(--c-white)" : "var(--c-white)",
                      textTransform: "uppercase",
                    }}>
                      {badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--c-border)", margin: "0 12px" }} />

        {/* Footer */}
        <div style={{ padding: "12px 12px" }}>
          {isAuthenticated ? (
            <button
              onClick={() => { logout(); toggle(); }}
              data-testid="button-sidebar-signout"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10,
                background: "transparent", border: "none", cursor: "pointer",
                transition: `background 0.15s ${EASE}`,
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--c-hover)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--c-hover)",
                border: "1px solid var(--c-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT, fontWeight: 700, fontSize: 11,
                color: "var(--c-ink-2)",
                flexShrink: 0,
              }}>
                {initials || <User size={14} strokeWidth={1.75} />}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 500,
                  color: "var(--c-ink)", letterSpacing: "-0.01em",
                  margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.displayName || user?.username}
                </p>
                <p style={{
                  fontFamily: FONT, fontSize: 11, color: "var(--c-ink-3)",
                  margin: 0,
                }}>
                  Sign out
                </p>
              </div>
              <LogOut size={15} strokeWidth={1.75} color="var(--c-ink-3)" />
            </button>
          ) : (
            <Link href="/login" onClick={toggle} style={{ textDecoration: "none" }}>
              <div
                data-testid="button-sidebar-login"
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  cursor: "pointer",
                  transition: `background 0.15s ${EASE}`,
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--c-hover)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <User size={18} strokeWidth={1.75} color="var(--c-ink-2)" />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: "var(--c-ink)" }}>
                  Sign In
                </span>
              </div>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
