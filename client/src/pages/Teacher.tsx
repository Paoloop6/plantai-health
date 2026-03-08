import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MinimalBarChart from "@/components/MinimalBarChart";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  Copy, 
  Trash2, 
  GraduationCap,
  Link as LinkIcon,
  Sprout,
  Target,
  Users,
  Eye,
  Leaf,
  BarChart3,
  TrendingUp,
  Camera,
  User,
  Calendar,
  MessageSquare,
  X,
  Send,
  FileText,
  ClipboardList,
  BookOpen
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { TeacherPrompt, Challenge, Plant } from "@shared/schema";
import { CircularProgress } from "@/components/CircularProgress";

interface DashboardStats {
  overview: {
    totalClasses: number;
    totalStudents: number;
    totalAssignments: number;
    totalSubmissions: number;
    avgCompletionRate: number;
  };
  classes: Array<{
    id: string;
    name: string;
    joinCode: string;
    studentCount: number;
    assignmentCount: number;
    totalSubmissions: number;
    completionRate: number;
    assignments: Array<{
      id: string;
      title: string;
      targetCount: number;
      dueDate: string | null;
      submissionCount: number;
      studentCount: number;
      completionRate: number;
    }>;
  }>;
}

const promptSchema = z.object({
  teacherName: z.string().min(1, "Name is required"),
  promptTitle: z.string().min(1, "Title is required"),
  customInstructions: z.string().min(10, "Instructions must be at least 10 characters"),
  learningGoal: z.string().optional(),
  activityInstructions: z.string().optional(),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  enablePropagationMode: z.boolean().default(false),
});

const challengeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetCount: z.number().min(1).max(20).default(3),
  minConfidence: z.number().min(50).max(100).default(85),
  plantCategory: z.string().optional(),
});

type PromptFormData = z.infer<typeof promptSchema>;
type ChallengeFormData = z.infer<typeof challengeSchema>;


export default function Teacher() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Plant | null>(null);
  const [teacherComment, setTeacherComment] = useState("");

  // Require teacher login
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "teacher")) {
      toast({
        title: "Teacher access required",
        description: "Please sign in as a teacher to access this page.",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, user, setLocation, toast]);

  const isTeacher = isAuthenticated && user?.role === "teacher";

  const { data: prompts, isLoading } = useQuery<TeacherPrompt[]>({
    queryKey: ["/api/teacher-prompts"],
    enabled: isTeacher,
  });

  const { data: allSubmissions } = useQuery<Plant[]>({
    queryKey: ["/api/teacher/all-submissions"],
    enabled: isTeacher,
  });

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/teacher/dashboard-stats"],
    enabled: isTeacher,
  });

  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: [`/api/challenges?promptId=${selectedPromptId}`],
    enabled: isTeacher && !!selectedPromptId,
  });

  const { data: submissions } = useQuery<Plant[]>({
    queryKey: ["/api/submissions", selectedPromptId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${selectedPromptId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    enabled: isTeacher && !!selectedPromptId,
  });

  const promptForm = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      teacherName: "",
      promptTitle: "",
      customInstructions: "",
      learningGoal: "",
      activityInstructions: "",
      gradeLevel: "",
      subject: "",
      enablePropagationMode: false,
    },
  });

  const challengeForm = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      description: "",
      targetCount: 3,
      minConfidence: 85,
      plantCategory: "",
    },
  });

  const createPrompt = useMutation({
    mutationFn: (data: PromptFormData) =>
      apiRequest("POST", "/api/teacher-prompts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-prompts"] });
      promptForm.reset();
      setShowPromptForm(false);
      toast({ title: "Success", description: "Teacher prompt created!" });
    },
  });

  const deletePrompt = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/teacher-prompts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-prompts"] });
      setSelectedPromptId(null);
      toast({ title: "Deleted", description: "Prompt removed" });
    },
  });

  const createChallenge = useMutation({
    mutationFn: (data: ChallengeFormData & { teacherPromptId: string }) =>
      apiRequest("POST", "/api/challenges", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/challenges?promptId=${selectedPromptId}`] });
      challengeForm.reset();
      setShowChallengeForm(false);
      toast({ title: "Success", description: "Challenge created!" });
    },
  });

  const saveTeacherComment = useMutation({
    mutationFn: async ({ plantId, comment }: { plantId: string; comment: string }) => {
      const response = await fetch(`/api/plants/${plantId}/teacher-comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teacherComment: comment }),
      });
      if (!response.ok) throw new Error("Failed to save comment");
      return response.json();
    },
    onSuccess: (updatedPlant) => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", selectedPromptId] });
      setSelectedSubmission(updatedPlant);
      toast({ title: "Saved", description: "Your feedback has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save comment", variant: "destructive" });
    },
  });

  const computeChartData = (data: Plant[] | undefined) => {
    if (!data || data.length === 0) return { barData: [], confidencePieData: [], photoQualityPieData: [] };
    
    const submissionsByDate: Record<string, number> = {};
    data.forEach((s) => {
      const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown";
      submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
    });
    
    const barData = Object.entries(submissionsByDate)
      .slice(-7)
      .map(([date, count]) => ({ date, count }));
    
    const confidenceRanges = { "90-100%": 0, "80-89%": 0, "70-79%": 0, "<70%": 0 };
    const photoQualityRanges = { "90-100%": 0, "80-89%": 0, "70-79%": 0, "<70%": 0 };
    
    data.forEach((s) => {
      if (s.confidenceScore != null) {
        if (s.confidenceScore >= 90) confidenceRanges["90-100%"]++;
        else if (s.confidenceScore >= 80) confidenceRanges["80-89%"]++;
        else if (s.confidenceScore >= 70) confidenceRanges["70-79%"]++;
        else confidenceRanges["<70%"]++;
      }
      if (s.photoQualityScore != null) {
        if (s.photoQualityScore >= 90) photoQualityRanges["90-100%"]++;
        else if (s.photoQualityScore >= 80) photoQualityRanges["80-89%"]++;
        else if (s.photoQualityScore >= 70) photoQualityRanges["70-79%"]++;
        else photoQualityRanges["<70%"]++;
      }
    });
    
    const confidencePieData = Object.entries(confidenceRanges)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
    
    const photoQualityPieData = Object.entries(photoQualityRanges)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
    
    return { barData, confidencePieData, photoQualityPieData };
  };

  const chartData = useMemo(() => computeChartData(submissions), [submissions]);
  const overallChartData = useMemo(() => computeChartData(allSubmissions), [allSubmissions]);

  const overallStats = useMemo(() => {
    if (!allSubmissions || allSubmissions.length === 0) return null;
    
    const validConfidenceScores = allSubmissions.filter(p => p.confidenceScore != null);
    const validPhotoScores = allSubmissions.filter(p => p.photoQualityScore != null);
    const avgConfidence = validConfidenceScores.length > 0 
      ? Math.round(validConfidenceScores.reduce((acc, p) => acc + (p.confidenceScore || 0), 0) / validConfidenceScores.length)
      : null;
    const avgPhotoQuality = validPhotoScores.length > 0
      ? Math.round(validPhotoScores.reduce((acc, p) => acc + (p.photoQualityScore || 0), 0) / validPhotoScores.length)
      : null;
    const uniqueStudents = new Set(allSubmissions.map(p => p.studentName).filter(Boolean)).size;
    
    return { total: allSubmissions.length, avgConfidence, avgPhotoQuality, uniqueStudents };
  }, [allSubmissions]);

  const copyLink = (code: string, type: "prompt" | "challenge") => {
    const baseUrl = window.location.origin;
    const link = type === "prompt" 
      ? `${baseUrl}/identify?code=${code}`
      : `${baseUrl}/challenge/${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const selectedPrompt = prompts?.find(p => p.id === selectedPromptId);

  useEffect(() => {
    if (selectedSubmission) {
      setTeacherComment(selectedSubmission.teacherComment || "");
    }
  }, [selectedSubmission]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated as teacher (will redirect)
  if (!isAuthenticated || user?.role !== "teacher") {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <main className="page-container py-8 page-enter">
        <div className="mb-8">
          <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>Education</p>
          <h1 className="t-h1" style={{ color: "var(--c-ink)" }}>Teacher Dashboard</h1>
        </div>
        {/* Class & Assignment Analytics Overview */}
        {dashboardStats && dashboardStats.classes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg" style={{ background: "var(--c-surface-2)" }}>
                <BarChart3 className="w-6 h-6" style={{ color: "var(--c-ink-2)" }} />
              </div>
              <div>
                <h2 className="t-h2" style={{ color: "var(--c-ink)" }}>Class Analytics</h2>
                <p className="text-sm text-muted-foreground">Assignment completion rates and student progress</p>
              </div>
            </div>
            
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4" data-testid="stat-total-classes">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "var(--c-surface-2)" }}>
                    <BookOpen className="w-5 h-5" style={{ color: "var(--c-ink-2)" }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--c-ink)" }}>{dashboardStats.overview.totalClasses}</div>
                    <div className="text-xs text-muted-foreground">Classes</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4" data-testid="stat-total-students-classes">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "var(--c-surface-2)" }}>
                    <Users className="w-5 h-5" style={{ color: "var(--c-ink-2)" }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--c-ink)" }}>{dashboardStats.overview.totalStudents}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4" data-testid="stat-total-assignments">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "var(--c-surface-2)" }}>
                    <ClipboardList className="w-5 h-5" style={{ color: "var(--c-ink-2)" }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--c-ink)" }}>{dashboardStats.overview.totalAssignments}</div>
                    <div className="text-xs text-muted-foreground">Assignments</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4" data-testid="stat-total-submissions-classes">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "var(--c-surface-2)" }}>
                    <FileText className="w-5 h-5" style={{ color: "var(--c-ink-2)" }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--c-ink)" }}>{dashboardStats.overview.totalSubmissions}</div>
                    <div className="text-xs text-muted-foreground">Submissions</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4" data-testid="stat-avg-completion">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "var(--c-surface-2)" }}>
                    <TrendingUp className="w-5 h-5" style={{ color: "var(--c-ink-2)" }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--c-ink)" }}>{dashboardStats.overview.avgCompletionRate}%</div>
                    <div className="text-xs text-muted-foreground">Avg Completion</div>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Class-by-Class Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardStats.classes.map((classData) => (
                <Card key={classData.id} className="p-5 hover-elevate" data-testid={`card-class-stats-${classData.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{classData.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-mono text-xs">{classData.joinCode}</Badge>
                        <span className="text-xs text-muted-foreground">{classData.studentCount} students</span>
                      </div>
                    </div>
                    <CircularProgress 
                      value={classData.completionRate} 
                      size={70} 
                      strokeWidth={6}
                      color={classData.completionRate >= 70 ? "#22c55e" : classData.completionRate >= 40 ? "#f59e0b" : "#ef4444"}
                    />
                  </div>
                  
                  {classData.assignments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignments</p>
                      {classData.assignments.slice(0, 3).map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground">{assignment.submissionCount}/{assignment.studentCount} submitted</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${assignment.completionRate}%`,
                                  backgroundColor: assignment.completionRate >= 70 ? "#22c55e" : assignment.completionRate >= 40 ? "#f59e0b" : "#ef4444"
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium w-10 text-right">{assignment.completionRate}%</span>
                          </div>
                        </div>
                      ))}
                      {classData.assignments.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">+{classData.assignments.length - 3} more assignments</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No assignments yet</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Prompts</h2>
              <Button size="sm" onClick={() => setShowPromptForm(true)} data-testid="button-new-prompt">
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>

            {isLoading ? (
              <Card className="p-4">Loading...</Card>
            ) : prompts && prompts.length > 0 ? (
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <Card
                    key={prompt.id}
                    className={`p-4 cursor-pointer hover-elevate ${
                      selectedPromptId === prompt.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedPromptId(prompt.id)}
                    data-testid={`card-prompt-${prompt.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{prompt.promptTitle}</h3>
                        <p className="text-sm text-muted-foreground">{prompt.teacherName}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono">
                        {prompt.shareCode}
                      </Badge>
                    </div>
                    {prompt.enablePropagationMode && (
                      <Badge variant="secondary" className="mt-2">
                        <Sprout className="w-3 h-3 mr-1" />
                        Propagation
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No prompts yet</p>
                <Button onClick={() => setShowPromptForm(true)}>
                  Create Your First Prompt
                </Button>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            {showPromptForm ? (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Create Teacher Prompt</h2>
                <Form {...promptForm}>
                  <form onSubmit={promptForm.handleSubmit((data) => createPrompt.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={promptForm.control}
                        name="teacherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ms. Smith" data-testid="input-teacher-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={promptForm.control}
                        name="promptTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prompt Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="6th Grade Life Science" data-testid="input-prompt-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={promptForm.control}
                        name="gradeLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-grade-level">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="elementary">Elementary (K-5)</SelectItem>
                                <SelectItem value="middle">Middle School (6-8)</SelectItem>
                                <SelectItem value="high">High School (9-12)</SelectItem>
                                <SelectItem value="college">College</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={promptForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-subject">
                                  <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="science">Science</SelectItem>
                                <SelectItem value="biology">Biology</SelectItem>
                                <SelectItem value="environmental">Environmental Science</SelectItem>
                                <SelectItem value="agriculture">Agriculture</SelectItem>
                                <SelectItem value="art">Art</SelectItem>
                                <SelectItem value="history">History</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={promptForm.control}
                      name="learningGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Learning Goal</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="What should students learn from this activity? For example:
- Understand plant classification and taxonomy
- Identify key characteristics of local plant species
- Connect plant biology to ecosystem health"
                              data-testid="textarea-learning-goal"
                            />
                          </FormControl>
                          <FormDescription>
                            The learning objective that students should achieve through this activity.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={promptForm.control}
                      name="activityInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Instructions</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={4}
                              placeholder="Step-by-step instructions for students. For example:
1. Find 3 different plants in the school garden
2. Take a clear photo of each plant's leaves
3. Record the location where you found each plant
4. Answer the reflection questions for each plant"
                              data-testid="textarea-activity-instructions"
                            />
                          </FormControl>
                          <FormDescription>
                            Clear directions for students on what they should do during this activity.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={promptForm.control}
                      name="customInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Response Instructions</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={4}
                              placeholder="Instructions that shape the AI responses. For example:
- Align content to NGSS MS-LS2 standards about ecosystems
- Include connections to local history and Indigenous plant uses
- Use vocabulary appropriate for 6th graders
- Mention pollinators and their relationship to the plant"
                              data-testid="textarea-instructions"
                            />
                          </FormControl>
                          <FormDescription>
                            These instructions guide how the AI describes each plant identification.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={promptForm.control}
                      name="enablePropagationMode"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Propagation Mode</FormLabel>
                            <FormDescription>
                              Include seed collection, planting timing, and stem cutting advice
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-propagation"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={createPrompt.isPending} data-testid="button-create-prompt">
                        {createPrompt.isPending ? "Creating..." : "Create Prompt"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowPromptForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            ) : selectedPrompt ? (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedPrompt.promptTitle}</h2>
                      <p className="text-muted-foreground">{selectedPrompt.teacherName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(selectedPrompt.shareCode, "prompt")}
                        data-testid="button-copy-link"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePrompt.mutate(selectedPrompt.id)}
                        data-testid="button-delete-prompt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      {selectedPrompt.shareCode}
                    </Badge>
                    {selectedPrompt.gradeLevel && (
                      <Badge variant="outline">{selectedPrompt.gradeLevel}</Badge>
                    )}
                    {selectedPrompt.subject && (
                      <Badge variant="outline">{selectedPrompt.subject}</Badge>
                    )}
                    {selectedPrompt.enablePropagationMode && (
                      <Badge variant="secondary">
                        <Sprout className="w-3 h-3 mr-1" />
                        Propagation Mode
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedPrompt.learningGoal && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm text-primary">Learning Goal</h3>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{selectedPrompt.learningGoal}</p>
                      </div>
                    )}

                    {selectedPrompt.activityInstructions && (
                      <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList className="w-4 h-4 text-blue-500" />
                          <h3 className="font-medium text-sm text-blue-500">Activity Instructions</h3>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{selectedPrompt.activityInstructions}</p>
                      </div>
                    )}

                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium text-sm">AI Response Instructions</h3>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{selectedPrompt.customInstructions}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Challenges
                    </h3>
                    <Button size="sm" onClick={() => setShowChallengeForm(true)} data-testid="button-new-challenge">
                      <Plus className="w-4 h-4 mr-1" />
                      New Challenge
                    </Button>
                  </div>

                  {showChallengeForm ? (
                    <Form {...challengeForm}>
                      <form
                        onSubmit={challengeForm.handleSubmit((data) =>
                          createChallenge.mutate({ ...data, teacherPromptId: selectedPrompt.id })
                        )}
                        className="space-y-4 p-4 border rounded-lg"
                      >
                        <FormField
                          control={challengeForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Challenge Title</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Identify 3 Pollinator Plants" data-testid="input-challenge-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={challengeForm.control}
                            name="targetCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Target Count</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    data-testid="input-target-count"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={challengeForm.control}
                            name="minConfidence"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Confidence %</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={50}
                                    max={100}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    data-testid="input-min-confidence"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={challengeForm.control}
                          name="plantCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plant Category (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., pollinator plants, native species" data-testid="input-plant-category" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="submit" disabled={createChallenge.isPending}>
                            Create Challenge
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowChallengeForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : challenges && challenges.length > 0 ? (
                    <div className="space-y-3">
                      {challenges.map((challenge) => (
                        <div
                          key={challenge.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`card-challenge-${challenge.id}`}
                        >
                          <div>
                            <h4 className="font-medium">{challenge.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {challenge.targetCount} plants at {challenge.minConfidence}%+ confidence
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {challenge.shareCode}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(challenge.shareCode, "challenge")}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No challenges yet. Create one to set goals for your students.
                    </p>
                  )}
                </Card>

                {/* Dashboard Statistics with Charts */}
                {submissions && submissions.length > 0 && (() => {
                  const validConfidenceScores = submissions.filter(p => p.confidenceScore != null);
                  const validPhotoScores = submissions.filter(p => p.photoQualityScore != null);
                  const avgConfidence = validConfidenceScores.length > 0 
                    ? Math.round(validConfidenceScores.reduce((acc, p) => acc + (p.confidenceScore || 0), 0) / validConfidenceScores.length)
                    : null;
                  const avgPhotoQuality = validPhotoScores.length > 0
                    ? Math.round(validPhotoScores.reduce((acc, p) => acc + (p.photoQualityScore || 0), 0) / validPhotoScores.length)
                    : null;
                  const uniqueStudents = new Set(submissions.map(p => p.studentName).filter(Boolean)).size;
                  
                  return (
                    <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background" data-testid="card-dashboard">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary rounded-lg">
                          <BarChart3 className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Analytics Dashboard</h3>
                          <p className="text-sm text-muted-foreground">Track student performance and submissions</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-total-submissions">
                          <div className="text-4xl font-bold text-primary mb-1">{submissions.length}</div>
                          <div className="text-sm font-medium text-muted-foreground">Total Submissions</div>
                        </div>
                        <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-avg-confidence">
                          <div className="text-4xl font-bold text-green-600 mb-1">
                            {avgConfidence !== null ? `${avgConfidence}%` : "—"}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">Avg Confidence</div>
                        </div>
                        <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-avg-photo-quality">
                          <div className="text-4xl font-bold text-blue-600 mb-1">
                            {avgPhotoQuality !== null ? `${avgPhotoQuality}%` : "—"}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">Avg Photo Quality</div>
                        </div>
                        <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-unique-students">
                          <div className="text-4xl font-bold text-purple-600 mb-1">{uniqueStudents}</div>
                          <div className="text-sm font-medium text-muted-foreground">Unique Students</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {chartData.barData.length > 0 && (
                          <MinimalBarChart
                            data={chartData.barData.map(d => ({ label: d.date, value: d.count }))}
                            title="Submissions Over Time"
                            yLabel="Submissions"
                            className="h-64"
                            data-testid="chart-submissions-over-time"
                          />
                        )}
                        {chartData.confidencePieData.length > 0 && (
                          <MinimalBarChart
                            data={chartData.confidencePieData.map(d => ({ label: d.name, value: d.value }))}
                            title="Confidence Distribution"
                            yLabel="Plants"
                            className="h-64"
                            data-testid="chart-confidence-distribution"
                          />
                        )}
                        {chartData.photoQualityPieData.length > 0 && (
                          <MinimalBarChart
                            data={chartData.photoQualityPieData.map(d => ({ label: d.name, value: d.value }))}
                            title="Photo Quality Distribution"
                            yLabel="Plants"
                            className="h-64"
                            data-testid="chart-photo-quality-distribution"
                          />
                        )}
                      </div>
                    </Card>
                  );
                })()}

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Student Submissions
                    </h3>
                    <Badge variant="secondary">
                      {submissions?.length || 0} plants
                    </Badge>
                  </div>

                  {submissions && submissions.length > 0 ? (
                    <div className="space-y-3">
                      {submissions.map((plant) => (
                        <div
                          key={plant.id}
                          className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedSubmission(plant)}
                          data-testid={`card-submission-${plant.id}`}
                        >
                          {plant.imageUrl && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                              <img
                                src={plant.imageUrl.startsWith("/") ? plant.imageUrl : `/objects/${plant.imageUrl}`}
                                alt={plant.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{plant.name}</h4>
                              {plant.confidenceScore && (
                                <Badge variant={plant.confidenceScore >= 85 ? "default" : plant.confidenceScore >= 70 ? "secondary" : "destructive"}>
                                  {plant.confidenceScore}%
                                </Badge>
                              )}
                              {plant.studentAnswer && (
                                <FileText className="w-4 h-4 text-primary" />
                              )}
                              {plant.studentComment && (
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{plant.species}</p>
                            {plant.studentName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                By: {plant.studentName}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {plant.photoQualityScore && (
                              <p className="text-xs text-muted-foreground">
                                Photo: {plant.photoQualityScore}%
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {plant.createdAt && new Date(plant.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Leaf className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>No submissions yet</p>
                      <p className="text-sm mt-1">Share your class code with students to get started</p>
                    </div>
                  )}
                </Card>

                {/* Submission Detail Dialog */}
                <Dialog open={!!selectedSubmission} onOpenChange={(open) => {
                  if (!open) {
                    setSelectedSubmission(null);
                    setTeacherComment("");
                  }
                }}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-submission-detail">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-primary" />
                        Submission Details
                      </DialogTitle>
                    </DialogHeader>
                    {selectedSubmission && (
                      <div className="space-y-4">
                        {selectedSubmission.imageUrl && (
                          <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                            <img
                              src={selectedSubmission.imageUrl.startsWith("/") ? selectedSubmission.imageUrl : `/objects/${selectedSubmission.imageUrl}`}
                              alt={selectedSubmission.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div>
                          <h3 className="text-xl font-semibold">{selectedSubmission.name}</h3>
                          <p className="text-muted-foreground">{selectedSubmission.species}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Confidence: <strong>{selectedSubmission.confidenceScore}%</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Photo Quality: <strong>{selectedSubmission.photoQualityScore}%</strong></span>
                          </div>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{selectedSubmission.studentName || "Anonymous"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {selectedSubmission.createdAt && new Date(selectedSubmission.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {selectedSubmission.studentAnswer && (
                          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 rounded-md bg-primary/20">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-semibold text-primary">Student's Assignment Answer</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap bg-background p-3 rounded-md border">{selectedSubmission.studentAnswer}</p>
                          </div>
                        )}

                        {selectedSubmission.studentComment && (
                          <div className="p-4 bg-muted/30 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">Student's Notes</span>
                            </div>
                            <p className="text-sm italic text-muted-foreground">"{selectedSubmission.studentComment}"</p>
                          </div>
                        )}

                        {selectedSubmission.description && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground">{selectedSubmission.description}</p>
                          </div>
                        )}

                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Teacher Feedback</span>
                          </div>
                          <Textarea
                            placeholder="Add your feedback for the student..."
                            value={teacherComment}
                            onChange={(e) => setTeacherComment(e.target.value)}
                            className="min-h-[80px]"
                            data-testid="input-teacher-comment"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (selectedSubmission) {
                                saveTeacherComment.mutate({
                                  plantId: selectedSubmission.id,
                                  comment: teacherComment,
                                });
                              }
                            }}
                            disabled={saveTeacherComment.isPending}
                            data-testid="button-save-teacher-comment"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {saveTeacherComment.isPending ? "Saving..." : "Save Feedback"}
                          </Button>
                          {selectedSubmission.teacherComment && teacherComment === selectedSubmission.teacherComment && (
                            <p className="text-xs text-muted-foreground">Feedback saved</p>
                          )}
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="space-y-6">
                {overallStats && overallStats.total > 0 ? (
                  <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background" data-testid="card-overall-dashboard">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary rounded-lg">
                        <BarChart3 className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Overall Analytics</h3>
                        <p className="text-sm text-muted-foreground">Stats across all your prompts</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-overall-total">
                        <div className="text-4xl font-bold text-primary mb-1">{overallStats.total}</div>
                        <div className="text-sm font-medium text-muted-foreground">Total Submissions</div>
                      </div>
                      <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-overall-confidence">
                        <div className="text-4xl font-bold text-green-600 mb-1">
                          {overallStats.avgConfidence !== null ? `${overallStats.avgConfidence}%` : "—"}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Avg Confidence</div>
                      </div>
                      <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-overall-quality">
                        <div className="text-4xl font-bold text-blue-600 mb-1">
                          {overallStats.avgPhotoQuality !== null ? `${overallStats.avgPhotoQuality}%` : "—"}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Avg Photo Quality</div>
                      </div>
                      <div className="text-center p-5 bg-card border rounded-xl shadow-sm" data-testid="stat-overall-students">
                        <div className="text-4xl font-bold text-purple-600 mb-1">{overallStats.uniqueStudents}</div>
                        <div className="text-sm font-medium text-muted-foreground">Unique Students</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {overallChartData.barData.length > 0 && (
                        <MinimalBarChart
                          data={overallChartData.barData.map(d => ({ label: d.date, value: d.count }))}
                          title="Submissions Over Time"
                          yLabel="Submissions"
                          className="h-64"
                          data-testid="chart-overall-timeline"
                        />
                      )}
                      {overallChartData.confidencePieData.length > 0 && (
                        <MinimalBarChart
                          data={overallChartData.confidencePieData.map(d => ({ label: d.name, value: d.value }))}
                          title="Confidence Distribution"
                          yLabel="Plants"
                          className="h-64"
                          data-testid="chart-overall-confidence"
                        />
                      )}
                      {overallChartData.photoQualityPieData.length > 0 && (
                        <MinimalBarChart
                          data={overallChartData.photoQualityPieData.map(d => ({ label: d.name, value: d.value }))}
                          title="Photo Quality Distribution"
                          yLabel="Plants"
                          className="h-64"
                          data-testid="chart-overall-quality"
                        />
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Welcome to Your Dashboard</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a prompt and share it with your students to start seeing analytics here.
                    </p>
                  </Card>
                )}

                <Card className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Select a Prompt</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a prompt from the list to see detailed submissions and add feedback.
                  </p>
                  <Button onClick={() => setShowPromptForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Prompt
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
