import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Camera, Upload, ArrowLeft, Loader2, Sparkles, AlertTriangle, CheckCircle2, Info, Sprout, BookOpen, GraduationCap, MessageSquare, User, Leaf, FileText, Target, ClipboardList, MapPin, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { PlantIdentificationResult, TeacherPrompt } from "@shared/schema";

function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return "text-green-500";
  if (confidence >= 70) return "text-amber-500";
  return "text-red-500";
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 85) return { variant: "default" as const, text: "High Confidence" };
  if (confidence >= 70) return { variant: "secondary" as const, text: "Moderate Confidence" };
  return { variant: "destructive" as const, text: "Low Confidence" };
}

function getQualityLabel(quality: number): { label: string; color: string; icon: typeof CheckCircle2 } {
  if (quality >= 80) return { label: "Excellent Photo", color: "text-green-500", icon: CheckCircle2 };
  if (quality >= 60) return { label: "Good Photo", color: "text-amber-500", icon: CheckCircle2 };
  if (quality >= 40) return { label: "Fair Photo", color: "text-orange-500", icon: AlertTriangle };
  return { label: "Poor Photo Quality", color: "text-red-500", icon: AlertTriangle };
}

export default function Identify() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const teacherCode = params.get("code") || "";
  const propagationMode = params.get("propagation") === "true";
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [identificationResult, setIdentificationResult] = useState<PlantIdentificationResult | null>(null);
  const [studentComment, setStudentComment] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [studentName, setStudentName] = useState("");
  const [location, setGeoLocation] = useState<{ latitude: string; longitude: string; locationLabel: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const { toast } = useToast();

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not available",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toString();
        const lng = position.coords.longitude.toString();
        let label = "";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          const data = await response.json();
          if (data.address) {
            label = [data.address.city, data.address.state, data.address.country]
              .filter(Boolean)
              .join(", ");
          }
        } catch (e) {
          label = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        }
        setGeoLocation({ latitude: lat, longitude: lng, locationLabel: label || `${lat}, ${lng}` });
        setLocationLoading(false);
        toast({
          title: "Location captured",
          description: label || "Location added to your plant.",
        });
      },
      (error) => {
        setLocationLoading(false);
        let message = "Could not get your location.";
        if (error.code === 1) {
          message = "Please allow location access in your browser settings.";
        } else if (error.code === 2) {
          message = "Location unavailable. Please try again.";
        } else if (error.code === 3) {
          message = "Location request timed out. Please try again.";
        }
        toast({
          title: "Location error",
          description: message,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [toast]);
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Require login to identify plants
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please sign in to identify plants and save them to your collection.",
      });
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation, toast]);

  const { data: teacherPrompt } = useQuery<TeacherPrompt>({
    queryKey: ["/api/teacher-prompts/code", teacherCode],
    enabled: !!teacherCode,
  });

  const identifyMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      if (teacherCode) {
        formData.append("teacherCode", teacherCode);
      }
      if (propagationMode) {
        formData.append("propagation", "true");
      }
      
      const response = await fetch("/api/identify", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to identify plant");
      }
      
      return response.json() as Promise<PlantIdentificationResult>;
    },
    onSuccess: (data) => {
      setIdentificationResult(data);
    },
    onError: (error) => {
      toast({
        title: "Identification failed",
        description: error.message || "Unable to identify the plant. Please try another image.",
        variant: "destructive",
      });
    },
  });

  const savePlantMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      species: string;
      genus: string;
      family: string;
      order: string;
      plantClass: string;
      phylum: string;
      kingdom: string;
      nativeRegion: string;
      description: string;
      imageUrl: string;
      wateringFrequencyDays: number;
      lightRequirement: string;
      careInstructions: string;
      propagationInfo: string;
      educationalContent: string;
      confidenceScore: number;
      photoQualityScore: number;
      teacherPromptId?: string;
      studentComment?: string;
      studentAnswer?: string;
      studentName?: string;
      latitude?: string;
      longitude?: string;
      locationLabel?: string;
    }) => {
      return apiRequest("POST", "/api/plants", data);
    },
    onSuccess: () => {
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({
        title: "Plant saved!",
        description: "Your plant has been added to your collection.",
      });
      setLocation("/app");
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Failed to save plant",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const processImageFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Image too large", description: "Please select an image under 10MB", variant: "destructive" });
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid image type", description: "Please use a JPEG, PNG, GIF, or WebP image", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIdentificationResult(null);
    captureLocation();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImageFile(file);
    } else if (file) {
      toast({ title: "Invalid file type", description: "Please drop an image file (JPEG, PNG, GIF, or WebP)", variant: "destructive" });
    }
  };

  const handleIdentify = () => {
    if (selectedImage) {
      identifyMutation.mutate(selectedImage);
    }
  };

  const handleSavePlant = async () => {
    // Prevent double-clicks
    if (isSaving) return;
    
    // Check for missing prerequisites and show appropriate error
    if (!identificationResult) {
      toast({
        title: "No identification result",
        description: "Please identify a plant first before saving.",
        variant: "destructive",
      });
      return;
    }
    
    if (!previewUrl || !selectedImage) {
      toast({
        title: "No image selected",
        description: "Please select an image to identify and save.",
        variant: "destructive",
      });
      return;
    }
    
    // Check for very low confidence (likely not a plant)
    if (identificationResult.confidence < 20) {
      toast({
        title: "Cannot save - not a plant",
        description: "The image doesn't appear to be a plant. Please try a different photo.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    toast({
      title: "Adding plant...",
      description: "Please wait while we save your plant.",
    });
    
    // Warn about low confidence but allow save
    if (identificationResult.confidence < 50) {
      toast({
        title: "Low confidence identification",
        description: "This identification has low confidence. The result may not be accurate.",
      });
    }
    
    // Require student name for teacher assignments
    const effectiveStudentName = user?.displayName || user?.username || studentName.trim();
    if (teacherPrompt && (!effectiveStudentName || effectiveStudentName.length === 0)) {
      toast({
        title: "Name required",
        description: "Please enter your name to submit to your teacher.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure we have a valid name before submitting
    const finalStudentName = effectiveStudentName && effectiveStudentName.length > 0 ? effectiveStudentName : undefined;

    try {
      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        console.error("Upload URL error:", errorData);
        setIsSaving(false);
        toast({
          title: "Upload failed",
          description: errorData.error || "Could not get upload URL. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const uploadData = await uploadResponse.json();
      const uploadURL = uploadData.uploadURL;
      
      if (!uploadURL) {
        console.error("No upload URL returned:", uploadData);
        setIsSaving(false);
        toast({
          title: "Upload error",
          description: "Server didn't return an upload URL. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (selectedImage) {
        const imageUploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: selectedImage,
          headers: {
            "Content-Type": selectedImage.type,
          },
        });
        
        if (!imageUploadResponse.ok) {
          console.error("Image upload failed:", imageUploadResponse.status);
          setIsSaving(false);
          toast({
            title: "Image upload failed",
            description: "Could not upload image. Please try again.",
            variant: "destructive",
          });
          return;
        }

        const url = new URL(uploadURL);
        const pathParts = url.pathname.split("/");
        const objectId = pathParts[pathParts.length - 1];
        const objectPath = `/objects/uploads/${objectId}`;

        savePlantMutation.mutate({
          name: identificationResult.commonName,
          species: identificationResult.species,
          genus: identificationResult.genus,
          family: identificationResult.family,
          order: identificationResult.order,
          plantClass: identificationResult.plantClass,
          phylum: identificationResult.phylum,
          kingdom: identificationResult.kingdom,
          nativeRegion: identificationResult.nativeRegion,
          description: identificationResult.description,
          imageUrl: objectPath,
          wateringFrequencyDays: identificationResult.wateringFrequencyDays,
          lightRequirement: identificationResult.lightRequirement,
          careInstructions: identificationResult.careInstructions,
          propagationInfo: identificationResult.propagationInfo,
          educationalContent: identificationResult.educationalContent,
          confidenceScore: identificationResult.confidence,
          photoQualityScore: identificationResult.photoQuality,
          teacherPromptId: teacherPrompt?.id,
          studentComment: studentComment.trim() || undefined,
          studentAnswer: studentAnswer.trim() || undefined,
          studentName: finalStudentName,
          latitude: location?.latitude,
          longitude: location?.longitude,
          locationLabel: location?.locationLabel,
        });
      }
    } catch (error) {
      console.error("Error saving plant:", error);
      toast({
        title: "Failed to save plant",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const confidenceBadge = identificationResult ? getConfidenceBadge(identificationResult.confidence) : null;
  const qualityInfo = identificationResult ? getQualityLabel(identificationResult.photoQuality) : null;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <main className="page-container py-8 page-enter">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>AI Identification</p>
            <h1 className="t-h1" style={{ color: "var(--c-ink)" }}>Identify Plant</h1>
          </div>
          {teacherPrompt && (
            <Badge variant="secondary">
              <GraduationCap className="w-3 h-3 mr-1" />
              {teacherPrompt.promptTitle}
            </Badge>
          )}
        </div>
        {/* Propagation Mode Banner (when not from teacher) */}
        {propagationMode && !teacherPrompt && (
          <Card className="p-5 mb-6 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/5 border-amber-500/30 border-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sprout className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-amber-700">Propagation Mode Active</h3>
                <p className="text-sm text-muted-foreground">Your identification will include seed collection timing, propagation tips, and stem cutting advice</p>
              </div>
            </div>
          </Card>
        )}

        {teacherPrompt && (
          <Card className="p-5 mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 border-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-primary/20">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{teacherPrompt.promptTitle}</h3>
                <p className="text-sm text-muted-foreground">{teacherPrompt.teacherName}'s Class</p>
              </div>
              {teacherPrompt.gradeLevel && (
                <Badge variant="outline">{teacherPrompt.gradeLevel}</Badge>
              )}
              {teacherPrompt.enablePropagationMode && (
                <Badge variant="secondary">
                  <Sprout className="w-3 h-3 mr-1" />
                  Propagation Mode
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              {/* Learning Goal */}
              {teacherPrompt.learningGoal && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Learning Goal</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">{teacherPrompt.learningGoal}</p>
                </div>
              )}

              {/* Activity Instructions */}
              {teacherPrompt.activityInstructions && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-foreground">What To Do</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">{teacherPrompt.activityInstructions}</p>
                </div>
              )}

              {/* Custom Instructions (Answer Prompt) */}
              {teacherPrompt.customInstructions && (
                <div className="p-4 rounded-lg bg-background border-2 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">Answer This Question</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{teacherPrompt.customInstructions}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {!previewUrl ? (
          <div
            className="space-y-6 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            data-testid="drop-zone-identify"
          >
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-md pointer-events-none">
                <div className="text-center">
                  <ImagePlus className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p className="text-lg font-medium text-primary">Drop your plant photo here</p>
                  <p className="text-sm text-muted-foreground">JPEG, PNG, GIF, or WebP up to 10MB</p>
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Identify Your Plant</h2>
              <p className="text-muted-foreground">
                Upload, drag and drop, or take a clear photo of your plant
              </p>
            </div>

            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Tips for better identification:</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>Use natural lighting when possible</li>
                    <li>Include leaves, stems, or flowers clearly</li>
                    <li>Get close but keep the image in focus</li>
                    <li>Avoid blurry or dark photos</li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="grid gap-4">
              <Label htmlFor="image-upload">
                <Card className="p-12 cursor-pointer hover-elevate border-dashed border-2">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Upload or drop an image</p>
                      <p className="text-sm text-muted-foreground">
                        Choose a photo or drag and drop it here
                      </p>
                    </div>
                  </div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    data-testid="input-image-upload"
                  />
                </Card>
              </Label>

              <Label htmlFor="camera-upload">
                <Card className="p-12 cursor-pointer hover-elevate border-dashed border-2">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-full bg-chart-2/10">
                      <Camera className="w-8 h-8 text-chart-2" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Take a photo</p>
                      <p className="text-sm text-muted-foreground">
                        Use your camera to capture a plant
                      </p>
                    </div>
                  </div>
                  <Input
                    id="camera-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelect}
                    data-testid="input-camera-capture"
                  />
                </Card>
              </Label>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={previewUrl}
                  alt="Plant to identify"
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {locationLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Getting location...
                </span>
              ) : location ? (
                <span>{location.locationLabel}</span>
              ) : (
                <button
                  type="button"
                  onClick={captureLocation}
                  className="text-primary hover:underline"
                  data-testid="button-get-location"
                >
                  Add location
                </button>
              )}
            </div>

            {!identificationResult && !identifyMutation.isPending && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedImage(null);
                    setPreviewUrl(null);
                  }}
                  className="flex-1"
                  data-testid="button-change-image"
                >
                  Change Image
                </Button>
                <Button
                  onClick={handleIdentify}
                  className="flex-1"
                  data-testid="button-identify"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Identify Plant
                </Button>
              </div>
            )}

            {identifyMutation.isPending && (
              <Card className="p-8">
                <div className="flex flex-col items-center gap-5 text-center">
                  {/* Leaf spinner */}
                  <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* Rotating ring */}
                    <div
                      className="leaf-spinner-ring"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: "var(--c-border)",
                        
                        
                      }}
                    />
                    <Leaf
                      className="w-9 h-9"
                      style={{ color: "var(--c-ink-2)" }}
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--f-sans)", fontSize: "1.3rem", color: "var(--c-ink)", marginBottom: "0.4rem" }}>
                      Identifying your plant…
                    </p>
                    <p style={{ fontFamily: "var(--f-sans)", fontSize: "1rem", color: "var(--c-ink-2)" }}>
                      The mycelial network is analysing — this takes a few seconds
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {identificationResult && qualityInfo && confidenceBadge && (
              <div className="space-y-6 animate-slide-up">
                {/* Low confidence friendly warning */}
                {identificationResult.confidence < 70 && (
                  <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p style={{ fontFamily: "var(--f-sans)", fontSize: "1.1rem", color: "var(--c-ink)", marginBottom: "2px" }}>
                          Hmm, we're not totally sure about this one
                        </p>
                        <p className="text-muted-foreground">
                          {identificationResult.photoQuality < 60
                            ? "Try a photo in better light — it makes a big difference."
                            : "This plant may be tricky to identify. Review the details carefully."}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* ===== SIGNATURE PLANT HEALTH CARD ===== */}
                <Card className="overflow-hidden" data-testid="card-plant-result">
                  {/* Full-width photo */}
                  {previewUrl && (
                    <div style={{ width: "100%", height: 210, overflow: "hidden", position: "relative" }}>
                      <img
                        src={previewUrl}
                        alt={identificationResult.commonName}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      {/* Gradient wash over photo */}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)" }} />
                      {/* Confidence badge overlaid on photo */}
                      <div style={{ position: "absolute", top: 12, right: 12 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "rgba(0,0,0,0.65)",
                            backdropFilter: "blur(8px)",
                            border: `1px solid ${identificationResult.confidence >= 85 ? "rgba(102,255,102,0.4)" : identificationResult.confidence >= 70 ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
                            borderRadius: "4px",
                            padding: "3px 10px",
                            fontFamily: "var(--f-sans)",
                            fontSize: "0.7rem",
                            color: identificationResult.confidence >= 85 ? "#66ff66" : identificationResult.confidence >= 70 ? "#f59e0b" : "#ef4444",
                            letterSpacing: "0.05em",
                          }}
                          data-testid="badge-confidence"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {identificationResult.confidence}% confident
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ padding: "1.25rem" }}>
                    {/* Name block */}
                    <div style={{ marginBottom: "1rem" }}>
                      <h2
                        style={{ fontFamily: "var(--f-sans)", fontSize: "1.9rem", color: "var(--c-ink)", lineHeight: 1.1, marginBottom: "4px" }}
                        data-testid="text-plant-name"
                      >
                        {identificationResult.commonName}
                      </h2>
                      <p
                        style={{ fontFamily: "var(--f-sans)", fontStyle: "italic", fontSize: "1rem", color: "var(--c-ink-2)" }}
                        data-testid="text-plant-species"
                      >
                        {identificationResult.species}
                      </p>
                    </div>

                    {/* Health status pill */}
                    {(() => {
                      const text = (identificationResult.careInstructions || "").toLowerCase();
                      const isToxic = /toxic|poison|danger|deadly/.test(text);
                      const isCaution = /irritant|caution|avoid|mild|sensitiv/.test(text);
                      const health = isToxic
                        ? { label: "Toxic", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" }
                        : isCaution
                        ? { label: "Caution", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" }
                        : { label: "Safe", color: "#66ff66", bg: "rgba(102,255,102,0.12)", border: "rgba(102,255,102,0.35)" };
                      return (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: health.bg,
                            border: `1px solid ${health.border}`,
                            borderRadius: "4px",
                            padding: "4px 12px",
                            fontFamily: "var(--f-sans)",
                            fontSize: "0.7rem",
                            color: health.color,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            marginBottom: "1.1rem",
                          }}
                          data-testid="badge-health-status"
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: health.color, boxShadow: `0 0 6px ${health.color}`, display: "inline-block" }} />
                          {health.label}
                        </span>
                      );
                    })()}

                    {/* Three quick facts */}
                    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.9rem", color: "var(--c-ink)" }}>
                          {identificationResult.lightRequirement}
                        </span>
                        <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.78rem", color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Light
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.9rem", color: "var(--c-ink-2)" }}>
                          Every {identificationResult.wateringFrequencyDays}d
                        </span>
                        <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.78rem", color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Water
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.9rem", color: "var(--c-ink)", textTransform: "capitalize" }}>
                          {identificationResult.identificationLevel}
                        </span>
                        <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.78rem", color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          ID level
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ fontFamily: "var(--f-sans)", fontSize: "1rem", color: "var(--c-ink-2)", lineHeight: 1.65 }}>
                      {identificationResult.description}
                    </p>
                  </div>
                </Card>

                {/* Photo quality + confidence mini cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <qualityInfo.icon className={`w-4 h-4 ${qualityInfo.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">Photo Quality</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={identificationResult.photoQuality} className="flex-1" />
                      <span className={`text-base font-bold ${qualityInfo.color}`} data-testid="text-photo-quality">
                        {identificationResult.photoQuality}%
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${qualityInfo.color}`}>{qualityInfo.label}</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className={`w-4 h-4 ${getConfidenceColor(identificationResult.confidence)}`} />
                      <span className="text-xs font-medium text-muted-foreground">ID Confidence</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={identificationResult.confidence} className="flex-1" />
                      <span className={`text-base font-bold ${getConfidenceColor(identificationResult.confidence)}`} data-testid="text-confidence">
                        {identificationResult.confidence}%
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${getConfidenceColor(identificationResult.confidence)}`}>
                      {confidenceBadge.text}
                    </p>
                  </Card>
                </div>

                <Accordion type="multiple" defaultValue={["taxonomy", "care", "educational"]} className="space-y-2">
                  <AccordionItem value="taxonomy" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-600" />
                        Scientific Classification
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label className="text-muted-foreground text-xs">Kingdom</Label>
                          <p className="font-medium" data-testid="text-kingdom">{identificationResult.kingdom}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Phylum</Label>
                          <p className="font-medium" data-testid="text-phylum">{identificationResult.phylum}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Class</Label>
                          <p className="font-medium" data-testid="text-class">{identificationResult.plantClass}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Order</Label>
                          <p className="font-medium" data-testid="text-order">{identificationResult.order}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Family</Label>
                          <p className="font-medium" data-testid="text-family">{identificationResult.family}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Genus</Label>
                          <p className="font-medium" data-testid="text-genus">{identificationResult.genus}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-muted-foreground text-xs">Native Region</Label>
                          <p className="font-medium" data-testid="text-native-region">{identificationResult.nativeRegion}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="care" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Sprout className="w-5 h-5 text-green-500" />
                        Care Requirements
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <div>
                        <Label className="text-muted-foreground">Light Requirement</Label>
                        <p className="mt-1" data-testid="text-light-requirement">
                          {identificationResult.lightRequirement}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Watering Schedule</Label>
                        <p className="mt-1" data-testid="text-watering-frequency">
                          Every {identificationResult.wateringFrequencyDays} days
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Care Instructions</Label>
                        <p className="mt-1 text-sm" data-testid="text-care-instructions">
                          {identificationResult.careInstructions}
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="educational" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        Educational Content
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <p className="text-sm" data-testid="text-educational-content">
                        {identificationResult.educationalContent}
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  {identificationResult.propagationInfo && (
                    <AccordionItem value="propagation" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Sprout className="w-5 h-5 text-emerald-500" />
                          Propagation
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <p className="text-sm" data-testid="text-propagation-info">
                          {identificationResult.propagationInfo}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                <div className="space-y-4">
                  {teacherPrompt && !user && (
                    <div>
                      <Label htmlFor="student-name" className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        Your Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="student-name"
                        placeholder="Enter your full name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        data-testid="input-student-name"
                      />
                    </div>
                  )}
                  
                  {/* Student Answer - shown when teacher has custom instructions */}
                  {teacherPrompt?.customInstructions && (
                    <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 border-2">
                      <Label htmlFor="student-answer" className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-primary/20">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-primary">Your Assignment Answer</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Respond to your teacher's instructions above:
                      </p>
                      <Textarea
                        id="student-answer"
                        placeholder="Type your answer to the assignment here..."
                        value={studentAnswer}
                        onChange={(e) => setStudentAnswer(e.target.value)}
                        className="min-h-[120px] bg-background"
                        data-testid="input-student-answer"
                      />
                    </Card>
                  )}
                  
                  <div>
                    <Label htmlFor="student-comment" className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4" />
                      Add Your Notes (Optional)
                    </Label>
                    <Textarea
                      id="student-comment"
                      placeholder="Share what you learned about this plant, where you found it, or any observations..."
                      value={studentComment}
                      onChange={(e) => setStudentComment(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-student-comment"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIdentificationResult(null);
                        setSelectedImage(null);
                        setPreviewUrl(null);
                        setStudentComment("");
                        setStudentAnswer("");
                        setStudentName("");
                      }}
                      className="flex-1"
                      data-testid="button-try-another"
                    >
                      Try Another
                    </Button>
                    <Button
                      onClick={handleSavePlant}
                      disabled={isSaving || savePlantMutation.isPending || !identificationResult || identificationResult.confidence < 20}
                      className="flex-1"
                      data-testid="button-save-plant"
                    >
                      {isSaving || savePlantMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding plant...
                        </>
                      ) : identificationResult && identificationResult.confidence < 20 ? (
                        "Not a Plant"
                      ) : (
                        "Save to My Plants"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
