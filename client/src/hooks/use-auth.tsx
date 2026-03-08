import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface RegisterData {
  username: string;
  password: string;
  displayName?: string;
  role: string;
  classCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsRoleSelection: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoggingOut: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fetch current user - works for both Google and local auth
async function fetchUser(): Promise<User | null> {
  // Try the local auth endpoint first (existing system)
  const localResponse = await fetch("/api/auth/me", {
    credentials: "include",
  });
  
  if (localResponse.ok) {
    return localResponse.json();
  }
  
  // Try Replit Auth endpoint (Google login)
  const googleResponse = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (googleResponse.status === 401) {
    return null;
  }

  if (!googleResponse.ok) {
    return null;
  }

  return googleResponse.json();
}

async function loginFn(username: string, password: string): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }
  
  return response.json();
}

async function registerFn(data: RegisterData): Promise<User> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }
  
  return response.json();
}

async function logoutFn(): Promise<void> {
  // Try local logout first
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
  // Also try Google logout (handles session cleanup for Google auth)
  await fetch("/api/logout", { credentials: "include" }).catch(() => {});
  window.location.href = "/";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logoutFn,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const login = async (username: string, password: string) => {
    const userData = await loginFn(username, password);
    queryClient.setQueryData(["/api/auth/user"], userData);
  };

  const register = async (data: RegisterData) => {
    const userData = await registerFn(data);
    queryClient.setQueryData(["/api/auth/user"], userData);
  };

  // Check if Google user needs to select a role and username
  // Google users don't have a username until they complete the role selection page
  const needsRoleSelection = !!user && user.authProvider === "google" && !user.username;

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    needsRoleSelection,
    login,
    register,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
