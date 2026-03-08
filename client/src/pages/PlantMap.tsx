import { ArrowLeft, MapPin, Leaf, Camera } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlantMap } from "@/components/PlantMap";
import type { Plant } from "@shared/schema";

export default function PlantMapPage() {
  const [, setLocation] = useLocation();

  const { data: plants = [], isLoading } = useQuery<Plant[]>({
    queryKey: ["/api/plants/map"],
  });

  const plantsWithLocation = plants.filter((p) => p.latitude && p.longitude);

  const handlePlantClick = (plantId: string) => {
    setLocation(`/plants/${plantId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-[9999] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => { if (window.history.length > 1) { window.history.back(); } else { window.location.href = "/home"; } }} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg md:text-xl font-bold">Plant Map</h1>
          </div>
          <Badge className="ml-auto bg-emerald-100 text-emerald-800 border-0 no-default-hover-elevate no-default-active-elevate">
            <Camera className="w-3 h-3 mr-1" />
            {plantsWithLocation.length} locations
          </Badge>
        </div>
      </header>

      <main className="flex-1 flex flex-col page-enter">
        <div className="container mx-auto px-4 py-4">
          <p className="text-muted-foreground text-sm mb-4">
            Explore where plants have been discovered and identified. Click on a marker to view plant details.
          </p>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Leaf className="w-8 h-8 text-emerald-600 animate-pulse mx-auto mb-2" />
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : plantsWithLocation.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <Card className="max-w-md w-full">
              <CardContent className="pt-6 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Plant Locations Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  When you identify plants with GPS enabled, they'll appear on this map.
                </p>
                <Link href="/identify">
                  <Button variant="ghost" className="text-emerald-600" data-testid="link-identify">
                    Identify a plant now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 px-4 pb-4">
            <PlantMap
              plants={plants}
              onPlantClick={handlePlantClick}
              className="h-[calc(100vh-200px)] min-h-[400px]"
            />
          </div>
        )}

        {plantsWithLocation.length > 0 && (
          <div className="container mx-auto px-4 pb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              Recent Discoveries
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {plantsWithLocation.slice(0, 6).map((plant) => (
                <Link key={plant.id} href={`/plants/${plant.id}`}>
                  <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`card-plant-${plant.id}`}>
                    <div className="aspect-square relative">
                      <img
                        src={plant.imageUrl}
                        alt={plant.name}
                        className="w-full h-full object-cover"
                        data-testid={`img-plant-${plant.id}`}
                      />
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate" data-testid={`text-plant-name-${plant.id}`}>{plant.name}</p>
                      {plant.locationLabel && (
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-plant-location-${plant.id}`}>
                          {plant.locationLabel}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
