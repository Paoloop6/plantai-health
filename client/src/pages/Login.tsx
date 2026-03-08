import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Leaf, GraduationCap, BookOpen, Loader2, Eye, EyeOff, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated - go to dashboard based on role
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/home");
    }
  }, [isAuthenticated, setLocation]);
  
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [classCode, setClassCode] = useState("");

  const { data: userStats } = useQuery<{ count: number }>({
    queryKey: ["/api/stats/users"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (mode === "login") {
        await login(username, password);
        toast({ title: "Welcome back!", description: "You have been logged in successfully." });
        // Redirect will happen via useEffect when isAuthenticated becomes true
      } else {
        if (!role) {
          toast({ title: "Please select a role", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        await register({
          username,
          password,
          displayName: displayName || username,
          role,
          classCode: classCode || undefined,
        });
        toast({ title: "Account created!", description: "Welcome to PlantCare!" });
        // Redirect will happen via useEffect when isAuthenticated becomes true
      }
    } catch (error: any) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 page-enter" style={{ background: "var(--c-bg)" }}>
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Leaf className="w-8 h-8" style={{ color: "var(--c-ink)" }} />
        </div>
        <h1 className="t-h1" style={{ color: "var(--c-ink)", marginBottom: 4 }}>PlantCare</h1>
        <p style={{ color: "var(--c-ink-2)", fontSize: 15 }}>Educational Plant Identification</p>
        {userStats && userStats.count > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Join {userStats.count.toLocaleString()} learners already exploring plants!
          </p>
        )}
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{mode === "login" ? "Welcome Back" : "Create Account"}</CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Sign in to continue your plant learning journey" 
              : "Join PlantCare to start identifying plants"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-google-login"
              >
                <Chrome className="w-5 h-5" />
                Continue with Google
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && !role && (
                <div className="space-y-4">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Card 
                      className={`p-6 cursor-pointer hover-elevate text-center ${role === "teacher" ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setRole("teacher")}
                      data-testid="card-role-teacher"
                    >
                      <GraduationCap className="w-10 h-10 mx-auto mb-2 text-primary" />
                      <p className="font-semibold">Teacher</p>
                      <p className="text-xs text-muted-foreground mt-1">Create prompts & challenges</p>
                    </Card>
                    <Card 
                      className={`p-6 cursor-pointer hover-elevate text-center ${role === "student" ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setRole("student")}
                      data-testid="card-role-student"
                    >
                      <BookOpen className="w-10 h-10 mx-auto mb-2 text-chart-2" />
                      <p className="font-semibold">Student</p>
                      <p className="text-xs text-muted-foreground mt-1">Identify plants & learn</p>
                    </Card>
                  </div>
                </div>
              )}

              {(mode === "login" || role) && (
                <>
                  {mode === "register" && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
                      {role === "teacher" ? (
                        <GraduationCap className="w-5 h-5 text-primary" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-chart-2" />
                      )}
                      <span className="text-sm">Signing up as a {role}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="ml-auto"
                        onClick={() => setRole(null)}
                      >
                        Change
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      data-testid="input-username"
                    />
                  </div>

                  {mode === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="How should we call you?"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        data-testid="input-display-name"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {mode === "register" && role === "student" && (
                    <div className="space-y-2">
                      <Label htmlFor="classCode">Class Code (optional)</Label>
                      <Input
                        id="classCode"
                        type="text"
                        placeholder="Enter code from your teacher"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        data-testid="input-class-code"
                      />
                      <p className="text-xs text-muted-foreground">
                        You can join a class later from the app
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {mode === "login" ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      mode === "login" ? "Sign In" : "Create Account"
                    )}
                  </Button>
                </>
              )}
            </form>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground mt-8">
        Powered by AI plant identification
      </p>
    </div>
  );
}
