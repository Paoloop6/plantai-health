import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Leaf, Plus, Trash2, LogIn, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  messages?: Message[];
}

export default function AIChatbot() {
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  const { data: activeConversation, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", { title: "New Chat" });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(newConversation.id);
    },
    onError: (error) => {
      console.error("Failed to create conversation:", error);
      const errorMessage = error instanceof Error ? error.message : "Please try again";
      if (errorMessage.includes("401") || errorMessage.toLowerCase().includes("authentication")) {
        toast({
          title: "Please sign in",
          description: "You need to be logged in to use the AI Chatbot",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        toast({
          title: "Failed to start conversation",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }
    },
    onError: (error) => {
      console.error("Failed to delete conversation:", error);
      toast({
        title: "Failed to delete conversation",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const processImageFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Image too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({
        title: "Invalid image type",
        description: "Please select a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
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
      toast({
        title: "Invalid file type",
        description: "Please drop an image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || !activeConversationId || isStreaming) return;

    const userMessage = input.trim() || (selectedImage ? "What can you tell me about this plant?" : "");
    const imageToSend = selectedImage;
    const previewToShow = imagePreview;

    setInput("");
    clearImage();
    setIsStreaming(true);
    setStreamingMessage("");

    try {
      const formData = new FormData();
      formData.append("content", userMessage);
      if (imageToSend) {
        formData.append("image", imageToSend);
      }

      const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;
          try {
            const jsonStr = trimmedLine.slice(6);
            if (!jsonStr) continue;
            const data = JSON.parse(jsonStr);
            if (data.content) {
              fullResponse += data.content;
              setStreamingMessage(fullResponse);
            }
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.done) {
              setIsStreaming(false);
              setStreamingMessage("");
              refetchConversation();
              return;
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      
      if (isStreaming) {
        setIsStreaming(false);
        setStreamingMessage("");
        refetchConversation();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, streamingMessage]);

  const messages = activeConversation?.messages || [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--c-bg)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--c-ink-3)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
        <div className="page-container py-8 max-w-2xl">
          <div className="mb-6">
            <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>PlantCare</p>
            <h1 className="t-h1" style={{ color: "var(--c-ink)" }} data-testid="text-chatbot-title">Plant AI Assistant</h1>
          </div>
          
          <Card className="p-6 md:p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--c-surface-2)" }}>
              <LogIn className="w-8 h-8" style={{ color: "var(--c-ink-2)" }} />
            </div>
            <h2 className="t-h2" style={{ color: "var(--c-ink)", marginBottom: 8 }}>Sign in to Chat</h2>
            <p className="t-meta" style={{ color: "var(--c-ink-2)", marginBottom: 20 }}>
              Please sign in to access the Plant AI Assistant and start chatting about plants.
            </p>
            <Link href="/login">
              <Button data-testid="button-login-to-chat">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <div className="page-container py-6 max-w-6xl">
        <div className="mb-4 md:mb-6">
          <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>PlantCare AI</p>
          <h1 className="t-h1" style={{ color: "var(--c-ink)" }} data-testid="text-chatbot-title">Plant Assistant</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 md:col-span-1">
            <div className="flex items-center justify-between gap-1 mb-4">
              <h2 className="font-semibold text-foreground">Chats</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => createConversationMutation.mutate()}
                disabled={createConversationMutation.isPending}
                data-testid="button-new-chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[200px] md:h-[400px]">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => createConversationMutation.mutate()}
                    data-testid="button-start-chat"
                  >
                    Start a chat
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between gap-1 p-3 rounded-md cursor-pointer transition-colors ${
                        activeConversationId === conv.id
                          ? "bg-muted"
                          : "hover-elevate"
                      }`}
                      onClick={() => setActiveConversationId(conv.id)}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <span className="text-sm truncate flex-1">{conv.title}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversationMutation.mutate(conv.id);
                        }}
                        data-testid={`button-delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          <Card
            className="p-4 md:col-span-3 flex flex-col h-[calc(100vh-200px)] md:h-[600px] relative"
            onDragEnter={activeConversationId ? handleDragEnter : undefined}
            onDragLeave={activeConversationId ? handleDragLeave : undefined}
            onDragOver={activeConversationId ? handleDragOver : undefined}
            onDrop={activeConversationId ? handleDrop : undefined}
            data-testid="chat-area"
          >
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-muted/80 border-2 border-dashed border-muted-foreground/30 rounded-md pointer-events-none">
                <div className="text-center">
                  <ImagePlus className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">Drop your image here</p>
                  <p className="text-sm text-muted-foreground">JPEG, PNG, GIF, or WebP up to 10MB</p>
                </div>
              </div>
            )}
            {!activeConversationId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Leaf className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Welcome to Plant AI Assistant
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  I can help you with plant identification, care tips, troubleshooting plant problems, 
                  and answering any questions about gardening and botany. Upload or drag and drop photos of plants!
                </p>
                <Button
                  onClick={() => createConversationMutation.mutate()}
                  disabled={createConversationMutation.isPending}
                  data-testid="button-start-conversation"
                >
                  {createConversationMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Start a conversation
                </Button>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                  <div className="space-y-4 pb-4">
                    {messages.length === 0 && !streamingMessage && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Ask me anything about plants!</p>
                        <p className="text-xs mt-1 text-muted-foreground">Upload or drag and drop photos for plant identification</p>
                      </div>
                    )}
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${message.id}`}
                      >
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-md overflow-hidden ${
                            message.role === "user"
                              ? "bg-foreground text-background"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {message.imageUrl && (
                            <img
                              src={message.imageUrl}
                              alt="Uploaded plant"
                              className="w-full max-h-64 object-cover"
                              data-testid={`img-message-${message.id}`}
                            />
                          )}
                          <div className="p-3">
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                        {message.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {streamingMessage && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-md bg-muted text-foreground">
                          <p className="whitespace-pre-wrap">{streamingMessage}</p>
                        </div>
                      </div>
                    )}
                    {isStreaming && !streamingMessage && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="p-3 rounded-md bg-muted">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {imagePreview && (
                  <div className="px-1 pt-3 border-t">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Selected plant"
                        className="h-20 w-20 object-cover rounded-md border border-border"
                        data-testid="img-preview"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                        data-testid="button-remove-image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                    data-testid="input-image-upload"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming}
                    data-testid="button-upload-image"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedImage ? "Add a message about this plant..." : "Ask about plant care, identification, or gardening tips..."}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isStreaming}
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={(!input.trim() && !selectedImage) || isStreaming}
                    data-testid="button-send-message"
                  >
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
