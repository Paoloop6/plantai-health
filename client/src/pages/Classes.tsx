import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Users, BookOpen, ClipboardList, Copy, Trash2, Calendar, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Class, Assignment } from "@shared/schema";

export default function Classes() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isTeacher = user?.role === "teacher";
  
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDescription, setNewAssignmentDescription] = useState("");
  const [newAssignmentInstructions, setNewAssignmentInstructions] = useState("");
  const [newAssignmentTargetCount, setNewAssignmentTargetCount] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);

  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: isAuthenticated,
  });

  const { data: classMembers } = useQuery<Array<{ id: string; username: string; displayName: string | null; joinedAt: string }>>({
    queryKey: ["/api/classes", selectedClass?.id, "members"],
    enabled: !!selectedClass && isTeacher,
  });

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/classes", selectedClass?.id, "assignments"],
    enabled: !!selectedClass,
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/classes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Class created!", description: "Your new class is ready." });
      setNewClassName("");
      setNewClassDescription("");
      setCreateClassOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create class", variant: "destructive" });
    },
  });

  const joinClassMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("POST", "/api/classes/join", { joinCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Joined class!", description: "You've successfully joined the class." });
      setJoinCode("");
    },
    onError: () => {
      toast({ title: "Failed to join class", description: "Check the code and try again.", variant: "destructive" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { classId: string; title: string; description: string; instructions: string; targetCount: number }) => {
      return apiRequest("POST", `/api/classes/${data.classId}/assignments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClass?.id, "assignments"] });
      toast({ title: "Assignment created!" });
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setNewAssignmentInstructions("");
      setNewAssignmentTargetCount(1);
      setCreateAssignmentOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create assignment", variant: "destructive" });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setSelectedClass(null);
      toast({ title: "Class deleted" });
    },
  });

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Join code copied!" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <main className="page-container py-8 page-enter">
        <div className="mb-8">
          <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>
            {isTeacher ? "Teaching" : "Enrolled"}
          </p>
          <h1 className="t-h1" style={{ color: "var(--c-ink)" }}>My Classes</h1>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Classes</h2>
              {isTeacher && (
                <Dialog open={createClassOpen} onOpenChange={setCreateClassOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-create-class">
                      <Plus className="w-4 h-4 mr-1" />
                      New Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="class-name">Class Name</Label>
                        <Input
                          id="class-name"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          placeholder="e.g., Biology 101"
                          data-testid="input-class-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="class-description">Description</Label>
                        <Textarea
                          id="class-description"
                          value={newClassDescription}
                          onChange={(e) => setNewClassDescription(e.target.value)}
                          placeholder="What is this class about?"
                          data-testid="input-class-description"
                        />
                      </div>
                      <Button
                        onClick={() => createClassMutation.mutate({ name: newClassName, description: newClassDescription })}
                        disabled={!newClassName.trim() || createClassMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-class"
                      >
                        {createClassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Class"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {!isTeacher && (
              <Card>
                <CardContent className="pt-4">
                  <Label htmlFor="join-code">Join a Class</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="join-code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      maxLength={6}
                      data-testid="input-join-code"
                    />
                    <Button
                      onClick={() => joinClassMutation.mutate(joinCode)}
                      disabled={joinCode.length < 6 || joinClassMutation.isPending}
                      data-testid="button-join-class"
                    >
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {classesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : classes?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {isTeacher ? "Create your first class to get started" : "Join a class using a code from your teacher"}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {classes?.map((cls) => (
                  <Card
                    key={cls.id}
                    className={`cursor-pointer transition-colors hover-elevate ${selectedClass?.id === cls.id ? "border-primary" : ""}`}
                    onClick={() => setSelectedClass(cls)}
                    data-testid={`card-class-${cls.id}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          {cls.description && (
                            <p className="text-sm text-muted-foreground truncate">{cls.description}</p>
                          )}
                        </div>
                        {isTeacher && (
                          <Badge variant="outline" className="font-mono">
                            {cls.joinCode}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            {selectedClass ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedClass.name}</CardTitle>
                      {selectedClass.description && (
                        <CardDescription>{selectedClass.description}</CardDescription>
                      )}
                    </div>
                    {isTeacher && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyJoinCode(selectedClass.joinCode)}>
                          <Copy className="w-4 h-4 mr-1" />
                          {selectedClass.joinCode}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteClassMutation.mutate(selectedClass.id)}
                          data-testid="button-delete-class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="assignments">
                    <TabsList className="w-full">
                      <TabsTrigger value="assignments" className="flex-1">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Assignments
                      </TabsTrigger>
                      {isTeacher && (
                        <TabsTrigger value="students" className="flex-1">
                          <Users className="w-4 h-4 mr-2" />
                          Students ({classMembers?.length || 0})
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="assignments" className="mt-4 space-y-4">
                      {isTeacher && (
                        <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-create-assignment">
                              <Plus className="w-4 h-4 mr-1" />
                              New Assignment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Assignment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label htmlFor="assignment-title">Title</Label>
                                <Input
                                  id="assignment-title"
                                  value={newAssignmentTitle}
                                  onChange={(e) => setNewAssignmentTitle(e.target.value)}
                                  placeholder="e.g., Identify 5 local plants"
                                  data-testid="input-assignment-title"
                                />
                              </div>
                              <div>
                                <Label htmlFor="assignment-description">Description</Label>
                                <Textarea
                                  id="assignment-description"
                                  value={newAssignmentDescription}
                                  onChange={(e) => setNewAssignmentDescription(e.target.value)}
                                  placeholder="What should students learn?"
                                />
                              </div>
                              <div>
                                <Label htmlFor="assignment-instructions">Instructions</Label>
                                <Textarea
                                  id="assignment-instructions"
                                  value={newAssignmentInstructions}
                                  onChange={(e) => setNewAssignmentInstructions(e.target.value)}
                                  placeholder="Step by step instructions..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="target-count">Target Plant Count</Label>
                                <Input
                                  id="target-count"
                                  type="number"
                                  min={1}
                                  value={newAssignmentTargetCount}
                                  onChange={(e) => setNewAssignmentTargetCount(parseInt(e.target.value) || 1)}
                                  data-testid="input-target-count"
                                />
                              </div>
                              <Button
                                onClick={() => createAssignmentMutation.mutate({
                                  classId: selectedClass.id,
                                  title: newAssignmentTitle,
                                  description: newAssignmentDescription,
                                  instructions: newAssignmentInstructions,
                                  targetCount: newAssignmentTargetCount,
                                })}
                                disabled={!newAssignmentTitle.trim() || createAssignmentMutation.isPending}
                                className="w-full"
                                data-testid="button-submit-assignment"
                              >
                                {createAssignmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Assignment"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {assignments?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {isTeacher ? "No assignments yet. Create one to get started!" : "No assignments in this class yet."}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {assignments?.map((assignment) => (
                            <Card key={assignment.id} className="hover-elevate" data-testid={`card-assignment-${assignment.id}`}>
                              <CardContent className="py-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">{assignment.title}</h4>
                                    {assignment.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Target className="w-4 h-4" />
                                        {assignment.targetCount} plants required
                                      </span>
                                      {assignment.dueDate && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-4 h-4" />
                                          Due {new Date(assignment.dueDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {!isTeacher && (
                                    <Button size="sm" onClick={() => setLocation(`/identify?assignment=${assignment.id}`)}>
                                      Start
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {isTeacher && (
                      <TabsContent value="students" className="mt-4">
                        {classMembers?.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No students have joined yet.</p>
                            <p className="text-sm mt-2">Share the code <span className="font-mono font-bold">{selectedClass.joinCode}</span> with your students.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {classMembers?.map((member) => (
                              <div 
                                key={member.id} 
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                data-testid={`student-${member.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium" data-testid={`student-name-${member.id}`}>
                                      {member.displayName || member.username}
                                    </p>
                                    <p className="text-xs text-muted-foreground" data-testid={`student-username-${member.id}`}>
                                      @{member.username || member.displayName || "User"} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a class to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
