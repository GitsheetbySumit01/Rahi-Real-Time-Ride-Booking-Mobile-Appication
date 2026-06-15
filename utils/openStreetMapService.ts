import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OSRM_BASE_URL = 'https://router.project-osrm.org';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // Increased to 1.1 seconds to respect OSM policy
let requestQueue: Array<() => void> = [];
let isProcessingQueue = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Queue system to handle rate limiting
const queueRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    if (!isProcessingQueue) {
      processQueue();
    }
  });
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    
    const request = requestQueue.shift();
    if (request) {
      lastRequestTime = Date.now();
      await request();
    }
  }
  
  isProcessingQueue = false;
};

export interface RouteResponse {
  distance: number;
  duration: number;
  geometry: any;
  coordinates: Array<{ latitude: number; longitude: number }>;
  summary: {
    distance: string;
    duration: string;
  };
}

export interface ServiceAreaResponse {
  available: boolean;
  message?: string;
  reason?: 'outside_service_area' | 'international' | 'no_route' | 'too_far';
}

// In-memory cache for geocoding results
const geocodeCache = new Map<string, { lat: number; lng: number }>();
const searchCache = new Map<string, any[]>();
const reverseGeocodeCache = new Map<string, string>();

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.length < 3) return null;
  
  // Check cache first
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }
  
  try {
    const response = await queueRequest(async () => {
      return await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          'accept-language': 'en',
          countrycodes: 'IN',
        },
        headers: {
          'User-Agent': 'RahiApp/1.0',
        },
        timeout: 10000,
      });
    });
    
    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
    return null;
  } catch (error) {
    // Silent fail - don't log 429 errors
    if (axios.isAxiosError(error) && error.response?.status !== 429) {
      console.error('Geocoding error:', error.message);
    }
    return null;
  }
};

export const searchPlaces = async (query: string): Promise<any[]> => {
  if (!query || query.length < 3) return [];
  
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
  
  try {
    const response = await queueRequest(async () => {
      return await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 8,
          addressdetails: 1,
          'accept-language': 'en',
          countrycodes: 'IN',
        },
        headers: {
          'User-Agent': 'RahiApp/1.0',
        },
        timeout: 10000,
      });
    });
    
    const results = response.data.map((item: any) => ({
      description: item.display_name,
      place_id: item.place_id,
      location: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
      address: item.display_name,
      country: item.address?.country || '',
      city: item.address?.city || item.address?.town || item.address?.village || '',
    }));
    
    // Cache results
    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    // Silent fail for 429 errors
    if (axios.isAxiosError(error) && error.response?.status !== 429) {
      console.error('Error searching places:', error.message);
    }
    return [];
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  // Check cache first
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }
  
  try {
    const response = await queueRequest(async () => {
      return await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          'accept-language': 'en',
        },
        headers: {
          'User-Agent': 'RahiApp/1.0',
        },
        timeout: 10000,
      });
    });
    
    if (response.data && response.data.display_name) {
      const address = response.data.display_name;
      reverseGeocodeCache.set(cacheKey, address);
      return address;
    }
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    reverseGeocodeCache.set(cacheKey, fallback);
    return fallback;
  } catch (error) {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    reverseGeocodeCache.set(cacheKey, fallback);
    return fallback;
  }
};

// Simplified service area check - only restrict by distance
export const checkServiceArea = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<ServiceAreaResponse> => {
  const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  
  // Only restrict trips over 100km
  if (distance > 100) {
    return {
      available: false,
      message: 'Outstation trips beyond 100km are currently not available.',
      reason: 'too_far'
    };
  }
  
  return { available: true };
};

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResponse | null> => {
  try {
    const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    
    const response = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: false,
        },
        timeout: 15000,
      }
    );
    
    if (response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        coordinates: coordinates,
        summary: {
          distance: (route.distance / 1000).toFixed(1),
          duration: formatDuration(route.duration),
        },
      };
    }
    
    // Fallback route
    return {
      distance: distance * 1000,
      duration: distance * 120,
      geometry: null,
      coordinates: [
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng },
      ],
      summary: {
        distance: distance.toFixed(1),
        duration: formatDuration(distance * 120),
      },
    };
  } catch (error: any) {
    const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      distance: distance * 1000,
      duration: distance * 120,
      geometry: null,
      coordinates: [
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng },
      ],
      summary: {
        distance: distance.toFixed(1),
        duration: formatDuration(distance * 120),
      },
    };
  }
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};