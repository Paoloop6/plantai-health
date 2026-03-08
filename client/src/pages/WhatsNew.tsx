import { Link } from "wouter";
import { 
  ArrowLeft, 
  Sparkles, 
  MapPin, 
  GraduationCap, 
  MessageSquare, 
  Map, 
  Camera,
  Calendar,
  Star,
  Leaf,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UpdateItem {
  date: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  link?: { href: string; label: string };
  isNew?: boolean;
}

const updates: UpdateItem[] = [
  {
    date: "January 2026",
    title: "GPS Location Tracking",
    description: "Plants now capture your location automatically when you identify them, helping you remember where you found each species.",
    icon: <MapPin className="w-6 h-6" />,
    color: "from-red-500 to-orange-500",
    features: [
      "Automatic GPS coordinates capture",
      "Human-readable location names",
      "Location displayed on plant cards",
    ],
    link: { href: "/identify", label: "Try Identifying a Plant" },
    isNew: true,
  },
  {
    date: "January 2026",
    title: "Classroom Management",
    description: "Teachers can now create classes, share join codes with students, and assign plant identification activities with grading.",
    icon: <GraduationCap className="w-6 h-6" />,
    color: "from-purple-500 to-indigo-500",
    features: [
      "Create and manage classes",
      "6-character join codes for easy sharing",
      "Create assignments with target plant counts",
      "Grade student submissions with feedback",
    ],
    link: { href: "/classes", label: "Go to My Classes" },
    isNew: true,
  },
  {
    date: "January 2026",
    title: "Community Forum",
    description: "Connect with other plant enthusiasts! Share discoveries, ask for identification help, and discuss care tips.",
    icon: <MessageSquare className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
    features: [
      "Five discussion categories",
      "Reply to posts and discussions",
      "Location-based plant discussions",
      "Classroom project sharing",
    ],
    link: { href: "/forum", label: "Visit the Forum" },
    isNew: true,
  },
  {
    date: "January 2026",
    title: "Interactive Plant Map",
    description: "View all your identified plants on an interactive map. See where your botanical discoveries are located!",
    icon: <Map className="w-6 h-6" />,
    color: "from-emerald-500 to-green-500",
    features: [
      "Interactive map with plant markers",
      "Click markers to view plant details",
      "See recent discoveries with photos",
    ],
    link: { href: "/map", label: "Open Plant Map" },
    isNew: true,
  },
  {
    date: "December 2025",
    title: "AI Plant Identification",
    description: "Our core feature uses GPT-4 Vision to identify plants from photos with detailed care instructions.",
    icon: <Camera className="w-6 h-6" />,
    color: "from-amber-500 to-yellow-500",
    features: [
      "AI-powered plant identification",
      "Detailed care instructions",
      "Scientific classification",
      "Educational content about ecology and history",
    ],
    link: { href: "/identify", label: "Identify a Plant" },
  },
];

export default function WhatsNew() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 8 }}>PlantCare</p>
          <h1 className="t-h1" style={{ color: "var(--c-ink)", marginBottom: 8 }}>What's New</h1>
          <p style={{ fontSize: 16, color: "var(--c-ink-2)", maxWidth: 520 }}>
            See what new features we've added to help you explore and learn about plants
          </p>
        </div>

        <div className="space-y-6">
          {updates.map((update, index) => (
            <Card 
              key={index} 
              className="overflow-hidden hover-elevate"
              data-testid={`card-update-${index}`}
            >
              <div className="flex flex-col md:flex-row">
                <div className={`w-full md:w-48 p-6 bg-gradient-to-br ${update.color} flex flex-col items-center justify-center text-white`}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                    {update.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 opacity-80" />
                    <span className="text-sm font-medium opacity-90">{update.date}</span>
                  </div>
                  {update.isNew && (
                    <Badge className="mt-2 bg-white/20 text-white border-0 no-default-hover-elevate no-default-active-elevate">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      New
                    </Badge>
                  )}
                </div>
                
                <div className="flex-1 p-6">
                  <h2 className="text-xl font-bold mb-2">{update.title}</h2>
                  <p className="text-muted-foreground mb-4">{update.description}</p>
                  
                  <ul className="space-y-2 mb-4">
                    {update.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${update.color}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {update.link && (
                    <Link href={update.link.href}>
                      <Button variant="outline" size="sm" data-testid={`button-update-link-${index}`}>
                        {update.link.label}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground">
            Have suggestions for new features?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/forum">
              <Button variant="outline" data-testid="button-feedback">
                <MessageSquare className="w-4 h-4 mr-2" />
                Share in the Forum
              </Button>
            </Link>
            <Link href="/changelog">
              <Button variant="outline" data-testid="button-changelog">
                <Code className="w-4 h-4 mr-2" />
                View Full Changelog
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
