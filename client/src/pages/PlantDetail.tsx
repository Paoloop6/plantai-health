import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Droplet, Sun, Calendar, Trash2, Loader2, Plus, FileText, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Plant, WateringHistory, PlantNote } from "@shared/schema";
import { format, differenceInDays, addDays } from "date-fns";
import { useState } from "react";

export default function PlantDetail() {
  const [, params] = useRoute("/plants/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const plantId = params?.id;

  const { data: plant, isLoading } = useQuery<Plant>({
    queryKey: ["/api/plants", plantId],
    enabled: !!plantId,
  });

  const { data: wateringHistory = [] } = useQuery<WateringHistory[]>({
    queryKey: ["/api/plants", plantId, "watering-history"],
    enabled: !!plantId,
  });

  const { data: plantNotes = [] } = useQuery<PlantNote[]>({
    queryKey: ["/api/plants", plantId, "notes"],
    enabled: !!plantId,
  });

  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const waterPlantMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/plants/${plantId}/water`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants", plantId] });
      queryClient.invalidateQueries({
        queryKey: ["/api/plants", plantId, "watering-history"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({
        title: "Plant watered!",
        description: "Next watering date has been updated.",
      });
    },
  });

  const updateFrequencyMutation = useMutation({
    mutationFn: async (days: number) => {
      return apiRequest("PATCH", `/api/plants/${plantId}`, {
        wateringFrequencyDays: days,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants", plantId] });
      toast({
        title: "Watering schedule updated",
        description: "The watering frequency has been changed.",
      });
    },
  });

  const deletePlantMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/plants/${plantId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({
        title: "Plant deleted",
        description: "The plant has been removed from your collection.",
      });
      setLocation("/");
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/plants/${plantId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants", plantId, "notes"] });
      setNewNote("");
      toast({
        title: "Note added",
        description: "Your observation has been recorded.",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      return apiRequest("PATCH", `/api/notes/${noteId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants", plantId, "notes"] });
      setEditingNoteId(null);
      setEditingContent("");
      toast({
        title: "Note updated",
        description: "Your changes have been saved.",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/notes/${noteId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants", plantId, "notes"] });
      toast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
        <div className="page-container py-6 space-y-4">
          <Skeleton className="w-full h-64 rounded-lg" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Plant not found</h2>
          <Button onClick={() => setLocation("/")}>Go back home</Button>
        </div>
      </div>
    );
  }

  const daysUntilWatering = plant.nextWatering
    ? differenceInDays(new Date(plant.nextWatering), new Date())
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <div className="page-container py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <p className="t-eyebrow" style={{ color: "var(--c-ink-3)" }}>Plant Details</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-delete">
                <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete plant?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {plant.name} from your collection.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletePlantMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="relative h-[50vh]">
        <img
          src={plant.imageUrl}
          alt={plant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-plant-name">
              {plant.name}
            </h1>
            <p className="text-white/90" data-testid="text-plant-species">
              {plant.species}
            </p>
          </div>
        </div>
      </div>

      <main className="page-container py-6 space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {plant.lastWatered
                  ? differenceInDays(new Date(), new Date(plant.lastWatered))
                  : "-"}
              </p>
              <p className="text-sm text-muted-foreground">Days since watered</p>
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${
                  daysUntilWatering !== null && daysUntilWatering < 0
                    ? "text-destructive"
                    : "text-primary"
                }`}
                data-testid="text-days-until-watering"
              >
                {daysUntilWatering !== null
                  ? daysUntilWatering < 0
                    ? "Overdue"
                    : daysUntilWatering
                  : "-"}
              </p>
              <p className="text-sm text-muted-foreground">Days until watering</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {plant.createdAt
                  ? differenceInDays(new Date(), new Date(plant.createdAt))
                  : "-"}
              </p>
              <p className="text-sm text-muted-foreground">Days owned</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Watering Schedule</h2>
            <Button
              onClick={() => waterPlantMutation.mutate()}
              disabled={waterPlantMutation.isPending}
              data-testid="button-water-now"
            >
              {waterPlantMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Watering...
                </>
              ) : (
                <>
                  <Droplet className="w-4 h-4 mr-2" />
                  Water Now
                </>
              )}
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div>
              <Label htmlFor="frequency">Watering Frequency (days)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  max="30"
                  defaultValue={plant.wateringFrequencyDays}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (value !== plant.wateringFrequencyDays && value > 0) {
                      updateFrequencyMutation.mutate(value);
                    }
                  }}
                  data-testid="input-frequency"
                />
              </div>
            </div>
            {plant.nextWatering && (
              <div>
                <Label>Next Watering Date</Label>
                <p className="mt-2" data-testid="text-next-watering">
                  {format(new Date(plant.nextWatering), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Care Information</h2>
          <div className="space-y-4">
            {plant.lightRequirement && (
              <div className="flex gap-3">
                <Sun className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <Label className="text-muted-foreground">Light</Label>
                  <p className="mt-1">{plant.lightRequirement}</p>
                </div>
              </div>
            )}
            {plant.careInstructions && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Care Instructions</Label>
                  <p className="mt-1 text-sm">{plant.careInstructions}</p>
                </div>
              </>
            )}
            {plant.description && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{plant.description}</p>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Watering History</h2>
          {wateringHistory.length > 0 ? (
            <div className="space-y-3">
              {wateringHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted"
                  data-testid={`history-entry-${entry.id}`}
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <Droplet className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {format(new Date(entry.wateredAt), "MMMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.wateredAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No watering history yet. Water your plant to start tracking!
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Notes & Observations</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note about your plant's health, growth, or any observations..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-note"
              />
              <Button
                onClick={() => {
                  if (newNote.trim()) {
                    createNoteMutation.mutate(newNote);
                  }
                }}
                disabled={!newNote.trim() || createNoteMutation.isPending}
                className="w-full"
                data-testid="button-add-note"
              >
                {createNoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Note...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </>
                )}
              </Button>
            </div>

            {plantNotes.length > 0 ? (
              <div className="space-y-3 mt-6">
                <Separator />
                <div className="space-y-3">
                  {plantNotes.map((note: PlantNote) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg bg-muted group relative"
                      data-testid={`note-${note.id}`}
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-[100px]"
                            data-testid={`input-edit-note-${note.id}`}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (editingContent.trim()) {
                                  updateNoteMutation.mutate({
                                    noteId: note.id,
                                    content: editingContent,
                                  });
                                }
                              }}
                              disabled={!editingContent.trim() || updateNoteMutation.isPending}
                              data-testid={`button-save-note-${note.id}`}
                            >
                              {updateNoteMutation.isPending ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3 mr-2" />
                                  Save
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingContent("");
                              }}
                              disabled={updateNoteMutation.isPending}
                              data-testid={`button-cancel-edit-${note.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 flex-1">
                            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {note.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(note.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingContent(note.content);
                              }}
                              data-testid={`button-edit-note-${note.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              disabled={deleteNoteMutation.isPending}
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No notes yet. Add your first observation to track your plant's journey!
                </p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
