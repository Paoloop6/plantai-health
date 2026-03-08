import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Leaf, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

export default function SelectRole() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if user already has completed setup, is not authenticated, or is not a Google user
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
      } else if (user?.authProvider !== "google") {
        // Non-Google users should not access this page
        setLocation("/home");
      } else if (user?.username) {
        // Google user already completed setup (has username)
        setLocation("/home");
      }
    }
  }, [isLoading, isAuthenticated, user?.authProvider, user?.username, setLocation]);

  const handleContinue = async () => {
    if (!username.trim() || username.length < 3) {
      toast({
        title: "Username required",
        description: "Please choose a username (at least 3 characters)",
        variant: "destructive",
      });
      return;
    }
    if (!role) {
      toast({
        title: "Please select a role",
        description: "Choose whether you are a teacher or student",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, username: username.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set role");
      }

      // Invalidate the user query to refresh user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Welcome to PlantCare!",
        description: `You're now signed in as a ${role}`,
      });
      
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set role. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Leaf className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Welcome to PlantCare!</h1>
        <p className="text-muted-foreground mt-2">
          {user?.displayName ? `Hi ${user.displayName}! ` : ""}Tell us about yourself
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Select Your Role</CardTitle>
          <CardDescription>
            This helps us personalize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Choose a username</Label>
            <Input
              id="username"
              placeholder="plantlover123"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              maxLength={20}
              data-testid="input-username"
            />
            <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card 
              className={`p-6 cursor-pointer hover-elevate text-center transition-all ${
                role === "teacher" ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
              }`}
              onClick={() => setRole("teacher")}
              data-testid="card-role-teacher"
            >
              <GraduationCap className="w-10 h-10 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Teacher</p>
              <p className="text-xs text-muted-foreground mt-1">Create prompts & manage classes</p>
            </Card>
            <Card 
              className={`p-6 cursor-pointer hover-elevate text-center transition-all ${
                role === "student" ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
              }`}
              onClick={() => setRole("student")}
              data-testid="card-role-student"
            >
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-chart-2" />
              <p className="font-semibold">Student</p>
              <p className="text-xs text-muted-foreground mt-1">Identify plants & learn</p>
            </Card>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={!role || isSubmitting}
            data-testid="button-continue"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up your account...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
