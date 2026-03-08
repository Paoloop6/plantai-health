import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, MessageSquare, MapPin, Leaf, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ForumPost, ForumReply } from "@shared/schema";

const CATEGORIES = [
  { value: "general", label: "General Discussion" },
  { value: "identification", label: "Plant Identification Help" },
  { value: "care", label: "Care Tips & Advice" },
  { value: "local", label: "Local Plants & Gardens" },
  { value: "classroom", label: "Classroom Projects" },
];

export default function Forum() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("general");
  const [replyContent, setReplyContent] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: posts, isLoading: postsLoading } = useQuery<ForumPost[]>({
    queryKey: ["/api/forum/posts", categoryFilter],
  });

  const { data: replies } = useQuery<ForumReply[]>({
    queryKey: ["/api/forum/posts", selectedPost?.id, "replies"],
    enabled: !!selectedPost,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string }) => {
      return apiRequest("POST", "/api/forum/posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
      toast({ title: "Post created!" });
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostCategory("general");
      setCreatePostOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: async (data: { postId: string; content: string }) => {
      return apiRequest("POST", `/api/forum/posts/${data.postId}/replies`, { content: data.content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/posts", selectedPost?.id, "replies"] });
      setReplyContent("");
    },
    onError: () => {
      toast({ title: "Failed to post reply", variant: "destructive" });
    },
  });

  const filteredPosts = posts?.filter(p => !categoryFilter || p.category === categoryFilter);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <div className="py-8 flex items-end justify-between">
          <div>
            <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>Community</p>
            <h1 className="t-h1" style={{ color: "var(--c-ink)" }}>Forum</h1>
          </div>
          {isAuthenticated && (
            <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-post">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="post-title">Title</Label>
                      <Input
                        id="post-title"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="What's your question or discovery?"
                        data-testid="input-post-title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="post-category">Category</Label>
                      <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="post-content">Content</Label>
                      <Textarea
                        id="post-content"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={5}
                        data-testid="input-post-content"
                      />
                    </div>
                    <Button
                      onClick={() => createPostMutation.mutate({
                        title: newPostTitle,
                        content: newPostContent,
                        category: newPostCategory,
                      })}
                      disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
                      className="w-full"
                      data-testid="button-submit-post"
                    >
                      {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Post"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="page-enter pb-12">
        {/* Floating Action Button for creating new posts */}
        {isAuthenticated && (
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30 md:hidden"
            onClick={() => setCreatePostOpen(true)}
            data-testid="button-fab-new-post"
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Categories</h2>
            </div>
            <div className="space-y-1">
              <Button
                variant={categoryFilter === null ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCategoryFilter(null)}
              >
                All Posts
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCategoryFilter(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedPost ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedPost.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {CATEGORIES.find(c => c.value === selectedPost.category)?.label || selectedPost.category}
                        </Badge>
                        {selectedPost.locationLabel && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedPost.locationLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPost(null)}>
                      Back to Posts
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Replies ({replies?.length || 0})
                    </h3>

                    {replies?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond!</p>
                    ) : (
                      <div className="space-y-4">
                        {replies?.map((reply) => (
                          <div key={reply.id} className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(reply.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {isAuthenticated && (
                      <div className="mt-4 flex gap-2">
                        <Input
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          data-testid="input-reply"
                        />
                        <Button
                          size="icon"
                          onClick={() => createReplyMutation.mutate({ postId: selectedPost.id, content: replyContent })}
                          disabled={!replyContent.trim() || createReplyMutation.isPending}
                          data-testid="button-send-reply"
                        >
                          {createReplyMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {postsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredPosts?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No posts yet. Start the conversation!</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPosts?.map((post) => (
                    <Card
                      key={post.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedPost(post)}
                      data-testid={`card-post-${post.id}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{post.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                              </Badge>
                              {post.locationLabel && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {post.locationLabel}
                                </span>
                              )}
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {post.plantId && (
                            <Leaf className="w-5 h-5 text-primary ml-4 shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
