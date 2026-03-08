import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider, useSidebar } from "@/hooks/use-sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppSidebar from "@/components/AppSidebar";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AuthWelcome from "@/pages/AuthWelcome";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Identify from "@/pages/Identify";
import PlantDetail from "@/pages/PlantDetail";
import Reminders from "@/pages/Reminders";
import Teacher from "@/pages/Teacher";
import Classes from "@/pages/Classes";
import Forum from "@/pages/Forum";
import WhatsNew from "@/pages/WhatsNew";
import Changelog from "@/pages/Changelog";
import PlantMapPage from "@/pages/PlantMap";
import AIChatbot from "@/pages/AIChatbot";
import SelectRole from "@/pages/SelectRole";
import Welcome, { useWelcomeState } from "@/pages/Welcome";
import NotFound from "@/pages/not-found";
import { Menu, Leaf } from "lucide-react";
import { Link } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/select-role" component={SelectRole} />
      <Route path="/welcome" component={AuthWelcome} />
      <Route path="/home" component={HomeWithWelcome} />
      <Route path="/app" component={Dashboard} />
      <Route path="/identify" component={Identify} />
      <Route path="/plants/:id" component={PlantDetail} />
      <Route path="/reminders" component={Reminders} />
      <Route path="/teacher" component={Teacher} />
      <Route path="/classes" component={Classes} />
      <Route path="/forum" component={Forum} />
      <Route path="/whats-new" component={WhatsNew} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/map" component={PlantMapPage} />
      <Route path="/chatbot" component={AIChatbot} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HomeWithWelcome() {
  const { showWelcome, completeWelcome } = useWelcomeState();
  if (showWelcome) return <Welcome onComplete={completeWelcome} />;
  return <Home />;
}

const HIDE_NAV = ["/", "/login", "/select-role", "/welcome"];

function TopNav() {
  const [location] = useLocation();
  const { toggle } = useSidebar();
  const { user, isAuthenticated } = useAuth();

  if (HIDE_NAV.includes(location)) return null;

  return (
    <header className="top-nav" style={{ padding: "0 24px", gap: 16 }}>
      <button
        onClick={toggle}
        data-testid="button-sidebar-toggle"
        aria-label="Open menu"
        style={{
          width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--c-border)",
          borderRadius: 8,
          background: "transparent",
          cursor: "pointer",
          color: "var(--c-ink)",
          flexShrink: 0,
        }}
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      <Link href="/home" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "var(--c-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Leaf size={14} color="#fff" strokeWidth={2} />
        </div>
        <span style={{
          fontWeight: 700, fontSize: 15,
          color: "var(--c-ink)", letterSpacing: "-0.02em",
          fontFamily: "var(--f-sans)",
        }}>
          PlantCare
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {isAuthenticated ? (
        <Link href="/app" style={{ textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--c-hover)",
            border: "1px solid var(--c-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--f-sans)", fontWeight: 700, fontSize: 11,
            color: "var(--c-ink-2)", cursor: "pointer",
          }}>
            {((user?.displayName || user?.username) ?? "?").slice(0, 2).toUpperCase()}
          </div>
        </Link>
      ) : (
        <Link href="/login" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "6px 16px", borderRadius: 999,
            background: "var(--c-black)", color: "var(--c-white)",
            border: "none", cursor: "pointer",
            fontFamily: "var(--f-sans)", fontSize: 13, fontWeight: 600,
            letterSpacing: "-0.01em",
          }}>
            Sign in
          </button>
        </Link>
      )}
    </header>
  );
}

function AppShell() {
  return (
    <>
      <AppSidebar />
      <div
        className="main-content"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <TopNav />
        <main style={{ flex: 1 }}>
          <Router />
        </main>
      </div>
    </>
  );
}

function RoleGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { needsRoleSelection, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && needsRoleSelection && location !== "/select-role") {
      setLocation("/select-role");
    }
  }, [needsRoleSelection, isLoading, location, setLocation]);

  return <>{children}</>;
}

function App() {
  /* Always light mode */
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <RoleGuard>
                <AppShell />
              </RoleGuard>
            </TooltipProvider>
          </SidebarProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
