import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Droplet, Calendar, Sprout, Search, Camera, Clock, Sun, Leaf, TrendingUp, CheckCircle2, Home, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Plant } from "@shared/schema";
import { differenceInDays, format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { useState, lazy, Suspense } from "react";

const PlantMap = lazy(() => import("@/components/PlantMap"));

const careTips = [
  { icon: Sun, tip: "Most plants prefer bright, indirect light", color: "text-amber-500" },
  { icon: Droplet, tip: "Check soil moisture before watering", color: "text-blue-500" },
  { icon: Leaf, tip: "Yellow leaves often indicate overwatering", color: "text-green-500" },
  { icon: TrendingUp, tip: "Plants grow faster in spring and summer", color: "text-primary" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [wateringFilter, setWateringFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [currentTipIndex] = useState(() => Math.floor(Math.random() * careTips.length));
  const [showMap, setShowMap] = useState(false);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("q", searchQuery);
  if (wateringFilter !== "all") queryParams.set("status", wateringFilter);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/plants?${queryString}` : "/api/plants";

  const { data: plants, isLoading } = useQuery<Plant[]>({
    queryKey: [endpoint],
  });

  const { data: allPlants } = useQuery<Plant[]>({
    queryKey: ["/api/plants"],
  });

  const plantsNeedingWater = allPlants?.filter(
    (plant) => plant.nextWatering && isPast(new Date(plant.nextWatering))
  ) || [];

  const plantsWateringToday = allPlants?.filter(
    (plant) => plant.nextWatering && isToday(new Date(plant.nextWatering))
  ) || [];

  const upcomingReminders = allPlants?.filter(
    (plant) =>
      plant.nextWatering &&
      !isPast(new Date(plant.nextWatering)) &&
      differenceInDays(new Date(plant.nextWatering), new Date()) <= 3
  ) || [];

  const recentlyWatered = allPlants?.filter(
    (plant) => plant.lastWatered && differenceInDays(new Date(), new Date(plant.lastWatered)) <= 7
  ).sort((a, b) => new Date(b.lastWatered!).getTime() - new Date(a.lastWatered!).getTime()).slice(0, 5) || [];

  const healthyPlants = allPlants?.filter(
    (plant) => !plant.nextWatering || !isPast(new Date(plant.nextWatering))
  ).length || 0;

  const healthPercentage = allPlants && allPlants.length > 0 
    ? Math.round((healthyPlants / allPlants.length) * 100) 
    : 100;

  const currentTip = careTips[currentTipIndex];

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <main className="page-container py-8 space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>My Collection</p>
            <h1 className="t-h1" style={{ color: "var(--c-ink)" }}>Plants</h1>
          </div>
          <Link href="/identify">
            <Button data-testid="button-add-plant">
              <Plus className="w-4 h-4 mr-2" />
              Add Plant
            </Button>
          </Link>
        </div>
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <currentTip.icon className={`w-5 h-5 ${currentTip.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Care Tip of the Day</p>
              <p className="text-sm font-medium" data-testid="text-care-tip">{currentTip.tip}</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/identify">
            <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid="card-quick-identify">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Identify Plant</span>
              </div>
            </Card>
          </Link>
          <Link href="/reminders">
            <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid="card-quick-reminders">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Droplet className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Reminders</span>
              </div>
            </Card>
          </Link>
          <Card className="p-4 h-full" data-testid="card-quick-health">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm font-medium">{healthPercentage}% Healthy</span>
            </div>
          </Card>
          <Card className="p-4 h-full" data-testid="card-quick-total">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Sprout className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm font-medium">{allPlants?.length || 0} Plants</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <Droplet className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-needs-water">
                  {plantsNeedingWater.length}
                </p>
                <p className="text-xs text-muted-foreground">Need Water Now</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-water-today">
                  {plantsWateringToday.length}
                </p>
                <p className="text-xs text-muted-foreground">Water Today</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-chart-2/10">
                <Calendar className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-upcoming-reminders">
                  {upcomingReminders.length}
                </p>
                <p className="text-xs text-muted-foreground">Next 3 Days</p>
              </div>
            </div>
          </Card>
        </div>

        {plantsNeedingWater.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Droplet className="w-5 h-5 text-destructive" />
                Needs Water Now
              </h2>
              <Badge variant="destructive" data-testid="badge-overdue-count">{plantsNeedingWater.length}</Badge>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {plantsNeedingWater.map((plant) => (
                  <Link key={plant.id} href={`/plants/${plant.id}`}>
                    <Card className="w-36 shrink-0 overflow-hidden hover-elevate cursor-pointer" data-testid={`card-overdue-${plant.id}`}>
                      <div className="aspect-square relative">
                        <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-sm font-medium truncate">{plant.name}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {recentlyWatered.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Recently Watered
              </h2>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {recentlyWatered.map((plant) => (
                  <Link key={plant.id} href={`/plants/${plant.id}`}>
                    <Card className="w-36 shrink-0 overflow-hidden hover-elevate cursor-pointer" data-testid={`card-recent-${plant.id}`}>
                      <div className="aspect-square relative">
                        <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-sm font-medium truncate">{plant.name}</p>
                          <p className="text-white/80 text-xs">
                            {formatDistanceToNow(new Date(plant.lastWatered!), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Plants</h2>
            <span className="text-sm text-muted-foreground">{plants?.length || 0} plants</span>
          </div>

          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search plants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={wateringFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setWateringFilter("all")}
                data-testid="button-filter-all"
              >
                All
              </Button>
              <Button
                variant={wateringFilter === "overdue" ? "default" : "outline"}
                size="sm"
                onClick={() => setWateringFilter("overdue")}
                data-testid="button-filter-overdue"
              >
                Overdue
              </Button>
              <Button
                variant={wateringFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setWateringFilter("today")}
                data-testid="button-filter-today"
              >
                Today
              </Button>
              <Button
                variant={wateringFilter === "upcoming" ? "default" : "outline"}
                size="sm"
                onClick={() => setWateringFilter("upcoming")}
                data-testid="button-filter-upcoming"
              >
                Upcoming
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-3">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : plants && plants.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {plants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--c-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Leaf className="w-7 h-7" style={{ color: "var(--c-ink-3)" }} />
              </div>
              <h3 className="t-h2" style={{ color: "var(--c-ink)", marginBottom: 8 }}>No plants yet</h3>
              <p className="t-meta" style={{ color: "var(--c-ink-2)", marginBottom: 20 }}>Identify your first plant to get started</p>
              <Link href="/identify">
                <Button data-testid="button-identify-first-plant">
                  <Camera className="w-4 h-4 mr-2" />
                  Identify a Plant
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {allPlants && allPlants.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapIcon className="w-5 h-5" />
                Plant Map
              </h2>
              <Button
                variant={showMap ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowMap(!showMap)}
                data-testid="button-toggle-map"
              >
                {showMap ? "Hide Map" : "Show Map"}
              </Button>
            </div>
            {showMap && (
              <Card className="overflow-hidden">
                <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                  <PlantMap
                    plants={allPlants}
                    onPlantClick={(id) => setLocation(`/plants/${id}`)}
                    className="h-80"
                  />
                </Suspense>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  const needsWater = plant.nextWatering && isPast(new Date(plant.nextWatering));
  const daysUntilWatering = plant.nextWatering
    ? differenceInDays(new Date(plant.nextWatering), new Date())
    : null;

  const getWateringStatus = () => {
    if (!plant.nextWatering) return { text: "Not set", color: "muted" };
    if (needsWater) return { text: "Overdue", color: "destructive" };
    if (daysUntilWatering !== null && daysUntilWatering === 0)
      return { text: "Today", color: "chart-2" };
    if (daysUntilWatering !== null && daysUntilWatering <= 2)
      return { text: `${daysUntilWatering}d`, color: "chart-2" };
    return { text: "OK", color: "primary" };
  };

  const status = getWateringStatus();

  return (
    <Link href={`/plants/${plant.id}`}>
      <Card
        className="overflow-hidden hover-elevate cursor-pointer group"
        data-testid={`card-plant-${plant.id}`}
      >
        <div className="relative aspect-square">
          <img
            src={plant.imageUrl}
            alt={plant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-2 right-2">
            <Badge 
              variant={status.color === "destructive" ? "destructive" : "secondary"}
              className={status.color === "destructive" ? "" : "bg-background/80 backdrop-blur-sm"}
              data-testid={`badge-status-${plant.id}`}
            >
              <Droplet className="w-3 h-3 mr-1" fill={needsWater ? "currentColor" : "none"} />
              {status.text}
            </Badge>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-white font-semibold truncate">{plant.name}</h3>
            <p className="text-white/80 text-xs truncate">{plant.species}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
