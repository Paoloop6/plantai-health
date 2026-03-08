import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Droplet, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Plant } from "@shared/schema";
import { format, differenceInDays, isPast, isToday, isTomorrow } from "date-fns";

export default function Reminders() {
  const { data: plants = [], isLoading } = useQuery<Plant[]>({
    queryKey: ["/api/plants"],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const waterPlantMutation = useMutation({
    mutationFn: async (plantId: string) => {
      return apiRequest("POST", `/api/plants/${plantId}/water`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({
        title: "Plant watered!",
        description: "Next watering date has been updated.",
      });
    },
  });

  const overduePlants = plants.filter(
    (plant) => plant.nextWatering && isPast(new Date(plant.nextWatering)) && !isToday(new Date(plant.nextWatering))
  );

  const todayPlants = plants.filter(
    (plant) => plant.nextWatering && isToday(new Date(plant.nextWatering))
  );

  const tomorrowPlants = plants.filter(
    (plant) => plant.nextWatering && isTomorrow(new Date(plant.nextWatering))
  );

  const upcomingPlants = plants
    .filter(
      (plant) =>
        plant.nextWatering &&
        !isPast(new Date(plant.nextWatering)) &&
        !isToday(new Date(plant.nextWatering)) &&
        !isTomorrow(new Date(plant.nextWatering)) &&
        differenceInDays(new Date(plant.nextWatering), new Date()) <= 7
    )
    .sort(
      (a, b) =>
        new Date(a.nextWatering!).getTime() - new Date(b.nextWatering!).getTime()
    );

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <main className="page-container py-8 space-y-8">
        <div>
          <p className="t-eyebrow" style={{ color: "var(--c-ink-3)", marginBottom: 4 }}>Schedule</p>
          <h1 className="t-h1" style={{ color: "var(--c-ink)" }}>Watering Reminders</h1>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : plants.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No reminders yet</h3>
            <p className="text-muted-foreground mb-6">
              Add plants to start tracking watering schedules
            </p>
            <Link href="/identify">
              <Button size="lg" data-testid="button-add-first-plant">
                Add Your First Plant
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {overduePlants.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-destructive">
                    Overdue
                  </h2>
                  <Badge variant="destructive">{overduePlants.length}</Badge>
                </div>
                <div className="space-y-3">
                  {overduePlants.map((plant) => (
                    <ReminderCard
                      key={plant.id}
                      plant={plant}
                      onWater={() => waterPlantMutation.mutate(plant.id)}
                      isWatering={waterPlantMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {todayPlants.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">Today</h2>
                  <Badge variant="secondary">{todayPlants.length}</Badge>
                </div>
                <div className="space-y-3">
                  {todayPlants.map((plant) => (
                    <ReminderCard
                      key={plant.id}
                      plant={plant}
                      onWater={() => waterPlantMutation.mutate(plant.id)}
                      isWatering={waterPlantMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {tomorrowPlants.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">Tomorrow</h2>
                  <Badge variant="secondary">{tomorrowPlants.length}</Badge>
                </div>
                <div className="space-y-3">
                  {tomorrowPlants.map((plant) => (
                    <ReminderCard
                      key={plant.id}
                      plant={plant}
                      onWater={() => waterPlantMutation.mutate(plant.id)}
                      isWatering={waterPlantMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {upcomingPlants.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">This Week</h2>
                  <Badge variant="secondary">{upcomingPlants.length}</Badge>
                </div>
                <div className="space-y-3">
                  {upcomingPlants.map((plant) => (
                    <ReminderCard
                      key={plant.id}
                      plant={plant}
                      onWater={() => waterPlantMutation.mutate(plant.id)}
                      isWatering={waterPlantMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {overduePlants.length === 0 &&
              todayPlants.length === 0 &&
              tomorrowPlants.length === 0 &&
              upcomingPlants.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Droplet className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">All plants watered!</h3>
                  <p className="text-muted-foreground">
                    Your plants are all taken care of. Great job! 🌱
                  </p>
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}

function ReminderCard({
  plant,
  onWater,
  isWatering,
}: {
  plant: Plant;
  onWater: () => void;
  isWatering: boolean;
}) {
  const daysUntil = plant.nextWatering
    ? differenceInDays(new Date(plant.nextWatering), new Date())
    : 0;
  const isOverdue = daysUntil < 0;

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`reminder-${plant.id}`}>
      <div className="flex items-center gap-4 p-4">
        <Link href={`/plants/${plant.id}`} className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden">
            <img
              src={plant.imageUrl}
              alt={plant.name}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/plants/${plant.id}`}>
            <h3 className="font-semibold truncate hover:text-primary">
              {plant.name}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">
            {plant.nextWatering
              ? isOverdue
                ? `${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? "day" : "days"} overdue`
                : format(new Date(plant.nextWatering), "MMM d")
              : "No schedule"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onWater}
            disabled={isWatering}
            data-testid={`button-water-${plant.id}`}
          >
            {isWatering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Droplet className="w-4 h-4 mr-2" />
                Water
              </>
            )}
          </Button>
          <Link href={`/plants/${plant.id}`}>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`button-view-${plant.id}`}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
