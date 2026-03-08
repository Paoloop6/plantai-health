import { ArrowLeft, Code, Database, Globe, Camera, Users, BookOpen, Map, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth?: boolean;
}

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
  endpoints?: ApiEndpoint[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "January 17, 2026",
    title: "Feature Discovery & Navigation",
    changes: [
      "Added What's New page for feature announcements",
      "Implemented hamburger sidebar navigation",
      "Added New badges to highlight recent features",
      "Forum and Map quick access in header",
    ],
    endpoints: [
      { method: "GET", path: "/api/stats/users", description: "Get user count statistics" },
      { method: "GET", path: "/api/stats/users/recent", description: "Get recently registered users" },
    ],
  },
  {
    version: "2.3.0",
    date: "January 16, 2026",
    title: "GPS, Classes & Community Forum",
    changes: [
      "GPS location tracking for plant identifications",
      "Classroom management with join codes",
      "Assignment creation and grading system",
      "Community forum with categories and replies",
      "Location-based discussions",
    ],
    endpoints: [
      { method: "GET", path: "/api/plants/map", description: "Get all plants with GPS coordinates" },
      { method: "GET", path: "/api/classes", description: "Get user's classes", auth: true },
      { method: "POST", path: "/api/classes", description: "Create a new class", auth: true },
      { method: "POST", path: "/api/classes/:id/join", description: "Join a class by code" },
      { method: "GET", path: "/api/classes/:id/assignments", description: "Get class assignments" },
      { method: "POST", path: "/api/classes/:id/assignments", description: "Create an assignment", auth: true },
      { method: "GET", path: "/api/forum/posts", description: "Get forum posts with filters" },
      { method: "POST", path: "/api/forum/posts", description: "Create a forum post", auth: true },
      { method: "POST", path: "/api/forum/posts/:id/replies", description: "Reply to a post", auth: true },
    ],
  },
  {
    version: "2.2.0",
    date: "December 23, 2024",
    title: "Home Dashboard & Learning Goals",
    changes: [
      "New role-aware home dashboard",
      "Learning goals for teacher prompts",
      "Activity instructions for students",
      "Student answer field for responses",
      "Propagation mode URL parameter support",
    ],
    endpoints: [
      { method: "GET", path: "/api/teacher-prompts", description: "Get teacher's prompts", auth: true },
      { method: "POST", path: "/api/teacher-prompts", description: "Create a teacher prompt", auth: true },
      { method: "GET", path: "/api/teacher-prompts/code/:code", description: "Get prompt by share code" },
    ],
  },
  {
    version: "2.1.0",
    date: "December 21, 2024",
    title: "Analytics & Scientific Classification",
    changes: [
      "Full taxonomy in plant identification",
      "Analytics dashboard for teachers",
      "Submission statistics and charts",
      "Teacher feedback on submissions",
      "Native region identification",
    ],
    endpoints: [
      { method: "GET", path: "/api/teacher-prompts/:id/submissions", description: "Get prompt submissions", auth: true },
      { method: "POST", path: "/api/submissions/:id/feedback", description: "Add feedback to submission", auth: true },
    ],
  },
  {
    version: "2.0.0",
    date: "December 19, 2024",
    title: "Teacher & Student System",
    changes: [
      "User authentication with roles",
      "Teacher prompt creation",
      "Shareable class codes",
      "Student challenges and goals",
      "Dual scoring (photo quality + confidence)",
    ],
    endpoints: [
      { method: "POST", path: "/api/auth/register", description: "Register new user" },
      { method: "POST", path: "/api/auth/login", description: "Login user" },
      { method: "GET", path: "/api/auth/me", description: "Get current user", auth: true },
      { method: "POST", path: "/api/auth/logout", description: "Logout user" },
    ],
  },
  {
    version: "1.0.0",
    date: "December 2024",
    title: "Initial Release",
    changes: [
      "AI plant identification with GPT-4o Vision",
      "Plant collection management",
      "Watering reminders and schedules",
      "Care instructions and tips",
      "Image upload and storage",
    ],
    endpoints: [
      { method: "GET", path: "/api/plants", description: "Get user's plants", auth: true },
      { method: "POST", path: "/api/plants", description: "Save identified plant", auth: true },
      { method: "GET", path: "/api/plants/:id", description: "Get plant details" },
      { method: "POST", path: "/api/identify", description: "Identify plant from image" },
      { method: "POST", path: "/api/plants/:id/water", description: "Log watering event" },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-[9999] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2 md:gap-4">
          <Link href="/whats-new">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg md:text-xl font-bold">Changelog & API</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-emerald-100 text-emerald-800 border-0 no-default-hover-elevate no-default-active-elevate">
            <BookOpen className="w-3 h-3 mr-1" />
            Developer Documentation
          </Badge>
          <h2 className="text-3xl font-bold mb-2">Version History & API Reference</h2>
          <p className="text-muted-foreground">
            Track changes and explore available API endpoints
          </p>
        </div>

        <div className="space-y-6">
          {changelog.map((entry) => (
            <Card key={entry.version} data-testid={`changelog-${entry.version}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      v{entry.version}
                    </Badge>
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Changes
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {entry.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>

                {entry.endpoints && entry.endpoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      API Endpoints
                    </h4>
                    <div className="space-y-2">
                      {entry.endpoints.map((endpoint, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md font-mono"
                        >
                          <Badge
                            className={`${methodColors[endpoint.method]} text-xs px-2 py-0.5 no-default-hover-elevate no-default-active-elevate`}
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="flex-1">{endpoint.path}</code>
                          {endpoint.auth && (
                            <Badge variant="outline" className="text-xs">
                              Auth
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
