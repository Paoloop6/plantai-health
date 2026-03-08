import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Plant } from "@shared/schema";

const plantIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PlantMapProps {
  plants: Plant[];
  onPlantClick?: (plantId: string) => void;
  className?: string;
}

function MapBoundsUpdater({ plants }: { plants: Plant[] }) {
  const map = useMap();

  const plantsWithLocation = plants.filter(
    (p) => p.latitude && p.longitude
  );

  if (plantsWithLocation.length > 0) {
    const bounds = new LatLngBounds(
      plantsWithLocation.map((p) => [
        parseFloat(p.latitude!),
        parseFloat(p.longitude!),
      ])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }

  return null;
}

export function PlantMap({ plants, onPlantClick, className = "" }: PlantMapProps) {
  const plantsWithLocation = plants.filter(
    (p) => p.latitude && p.longitude
  );

  if (plantsWithLocation.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">
          No plants with location data yet
        </p>
      </div>
    );
  }

  const center = {
    lat: parseFloat(plantsWithLocation[0].latitude!),
    lng: parseFloat(plantsWithLocation[0].longitude!),
  };

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%", minHeight: "300px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater plants={plants} />
        {plantsWithLocation.map((plant) => (
          <Marker
            key={plant.id}
            position={[
              parseFloat(plant.latitude!),
              parseFloat(plant.longitude!),
            ]}
            icon={plantIcon}
            eventHandlers={{
              click: () => onPlantClick?.(plant.id),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{plant.name}</p>
                {plant.species && plant.species !== "Unknown species" && (
                  <p className="text-muted-foreground italic">{plant.species}</p>
                )}
                {plant.locationLabel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {plant.locationLabel}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default PlantMap;
