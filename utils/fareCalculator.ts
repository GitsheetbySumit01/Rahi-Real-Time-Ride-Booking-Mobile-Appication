export interface VehicleType {
  id: string;
  name: string;
  icon: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  surgeMultiplier?: number;
}

export const calculateFare = (
  distance: number, // in km
  vehicle: VehicleType,
  duration: number = 0, // in minutes
  surge: boolean = false
): number => {
  let fare = vehicle.baseFare;
  
  // Distance charge
  fare += distance * vehicle.perKmRate;
  
  // Time charge (if applicable)
  if (duration > 0 && vehicle.perMinuteRate > 0) {
    fare += duration * vehicle.perMinuteRate;
  }
  
  // Surge pricing (1.2x to 2x based on demand)
  if (surge) {
    const surgeMultiplier = Math.random() * 0.8 + 1.2; // 1.2x to 2.0x
    fare *= surgeMultiplier;
  }
  
  // Round to nearest integer
  return Math.round(fare);
};

export const calculateDistanceFromLatLng = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};