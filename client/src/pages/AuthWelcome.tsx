import { useLocation } from "wouter";
import { Leaf, Camera, GraduationCap, BookOpen, Users, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { TeacherPrompt } from "@shared/schema";

export default function AuthWelcome() {
  const [, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();
  const [classCodeInput, setClassCodeInput] = useState("");

  const { data: userStats } = useQuery<{ count: number }>({
    queryKey: ["/api/stats/users"],
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleJoinClass = () => {
    if (classCodeInput.trim()) {
      setLocation(`/identify?code=${classCodeInput.trim().toUpperCase()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-primary" />
            <span className="font-semibold">PlantCare</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="font-medium">{user.displayName || user.username}</p>
              <p className="text-muted-foreground capitalize">{user.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome, {user.displayName || user.username}!
          </h1>
          <p className="text-xl text-muted-foreground">
            {user.role === "teacher" 
              ? "Ready to create learning experiences for your students?"
              : "Ready to discover the plants around you?"}
          </p>
          {userStats && (
            <p className="text-sm text-muted-foreground mt-4">
              <Users className="w-4 h-4 inline mr-1" />
              {userStats.count.toLocaleString()} users learning with PlantCare
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {user.role === "teacher" ? (
            <>
              <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/teacher")} data-testid="card-teacher-dashboard">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>Teacher Dashboard</CardTitle>
                  <CardDescription>
                    Create custom prompts, set challenges, and view student submissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/identify")} data-testid="card-identify-plant">
                <CardHeader>
                  <div className="p-3 rounded-full bg-chart-2/10 w-fit mb-2">
                    <Camera className="w-8 h-8 text-chart-2" />
                  </div>
                  <CardTitle>Try It Yourself</CardTitle>
                  <CardDescription>
                    Test the plant identification feature before sharing with students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Identify a Plant <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/identify")} data-testid="card-identify-plant">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>Identify a Plant</CardTitle>
                  <CardDescription>
                    Take a photo of any plant to learn its name, care needs, and fun facts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Start Identifying <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/home")} data-testid="card-my-plants">
                <CardHeader>
                  <div className="p-3 rounded-full bg-chart-2/10 w-fit mb-2">
                    <Leaf className="w-8 h-8 text-chart-2" />
                  </div>
                  <CardTitle>My Plant Collection</CardTitle>
                  <CardDescription>
                    View plants you've identified and track your watering schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View My Plants <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {user.role === "student" && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" />
                <CardTitle>Join a Class</CardTitle>
              </div>
              <CardDescription>
                Enter a code from your teacher to access class-specific instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter class code (e.g. ABC123)"
                    value={classCodeInput}
                    onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    data-testid="input-join-class-code"
                  />
                </div>
                <Button 
                  onClick={handleJoinClass}
                  disabled={!classCodeInput.trim()}
                  data-testid="button-join-class"
                >
                  Join
                </Button>
              </div>
              {user.classCode && (
                <p className="text-sm text-muted-foreground mt-3">
                  Current class: <span className="font-mono font-medium">{user.classCode}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
