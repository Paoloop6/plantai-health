import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sprout, Camera, Droplet, Bell, ChevronRight, Sparkles } from "lucide-react";

const WELCOME_SHOWN_KEY = "plantcare_welcome_shown";

interface WelcomeProps {
  onComplete: () => void;
}

export function useWelcomeState() {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(WELCOME_SHOWN_KEY);
  });

  const completeWelcome = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, "true");
    setShowWelcome(false);
  };

  return { showWelcome, completeWelcome };
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Camera,
      title: "Identify Plants",
      description: "Snap a photo and our AI will identify your plant species instantly",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Droplet,
      title: "Watering Reminders",
      description: "Never forget to water your plants with smart reminders",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Bell,
      title: "Care Schedule",
      description: "Track watering history and keep your plants healthy",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Sparkles,
      title: "Plant Journal",
      description: "Record notes and observations to monitor plant health",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const handleGetStarted = () => {
    onComplete();
    setLocation("/");
  };

  const handleSkip = () => {
    onComplete();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {step === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
            <Sprout className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold text-center mb-4">
            Welcome to PlantCare
          </h1>
          
          <p className="text-lg text-muted-foreground text-center max-w-md mb-12">
            Your personal plant companion for identification, care tracking, and watering reminders
          </p>

          <div className="w-full max-w-md space-y-4">
            <Button 
              size="lg" 
              className="w-full h-14 text-lg"
              onClick={() => setStep(1)}
              data-testid="button-see-features"
            >
              See What You Can Do
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={handleSkip}
              data-testid="button-skip-welcome"
            >
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 flex flex-col px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">What You Can Do</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSkip}
              data-testid="button-skip-features"
            >
              Skip
            </Button>
          </div>

          <div className="flex-1 space-y-4">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="p-4 hover-elevate"
                data-testid={`card-feature-${index}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${feature.bgColor} shrink-0`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="pt-6">
            <Button 
              size="lg" 
              className="w-full h-14 text-lg"
              onClick={handleGetStarted}
              data-testid="button-get-started"
            >
              Get Started
              <Sprout className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-2 pb-8">
        <div 
          className={`w-2 h-2 rounded-full transition-colors ${step === 0 ? "bg-primary" : "bg-muted"}`} 
        />
        <div 
          className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? "bg-primary" : "bg-muted"}`} 
        />
      </div>
    </div>
  );
}
