// services/driverService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  photo: string;
  rating: number;
  totalRides: number;
  vehicle: {
    model: string;
    number: string;
    color: string;
    type: string;
  };
  location: { lat: number; lng: number };
  distance: number;
  eta: number;
  isOnline: boolean;
}

// Mock drivers database
const MOCK_DRIVERS: Driver[] = [
  {
    id: 'driver_1',
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    photo: 'https://ui-avatars.com/api/?background=0F8A5F&color=fff&name=RK',
    rating: 4.9,
    totalRides: 2450,
    vehicle: {
      model: 'Honda Activa 6G',
      number: 'KA 01 AB 1234',
      color: 'Black',
      type: 'bike'
    },
    location: { lat: 12.9716, lng: 77.5946 },
    distance: 1.2,
    eta: 3,
    isOnline: true
  },
  {
    id: 'driver_2',
    name: 'Suresh Reddy',
    phone: '+91 98765 43211',
    photo: 'https://ui-avatars.com/api/?background=0F8A5F&color=fff&name=SR',
    rating: 4.8,
    totalRides: 1890,
    vehicle: {
      model: 'Bajaj Auto',
      number: 'KA 02 CD 5678',
      color: 'Green',
      type: 'auto'
    },
    location: { lat: 12.9616, lng: 77.5846 },
    distance: 1.5,
    eta: 4,
    isOnline: true
  },
  {
    id: 'driver_3',
    name: 'Priya Singh',
    phone: '+91 98765 43212',
    photo: 'https://ui-avatars.com/api/?background=0F8A5F&color=fff&name=PS',
    rating: 4.95,
    totalRides: 3120,
    vehicle: {
      model: 'Maruti Suzuki Swift',
      number: 'KA 03 EF 9012',
      color: 'White',
      type: 'cab'
    },
    location: { lat: 12.9816, lng: 77.6046 },
    distance: 0.8,
    eta: 2,
    isOnline: true
  },
  {
    id: 'driver_4',
    name: 'Amit Sharma',
    phone: '+91 98765 43213',
    photo: 'https://ui-avatars.com/api/?background=0F8A5F&color=fff&name=AS',
    rating: 4.85,
    totalRides: 2780,
    vehicle: {
      model: 'Hyundai i20',
      number: 'KA 04 GH 3456',
      color: 'Silver',
      type: 'cab'
    },
    location: { lat: 12.9916, lng: 77.6146 },
    distance: 1.8,
    eta: 5,
    isOnline: true
  },
  {
    id: 'driver_5',
    name: 'Karthik Nayak',
    phone: '+91 98765 43214',
    photo: 'https://ui-avatars.com/api/?background=0F8A5F&color=fff&name=KN',
    rating: 4.92,
    totalRides: 4230,
    vehicle: {
      model: 'Toyota Innova',
      number: 'KA 05 IJ 7890',
      color: 'Black',
      type: 'suv'
    },
    location: { lat: 12.9516, lng: 77.5746 },
    distance: 2.1,
    eta: 6,
    isOnline: true
  },
];

export const driverService = {
  async findNearestDriver(
    pickupLocation: { lat: number; lng: number },
    vehicleType: string
  ): Promise<Driver | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
    
    // Filter drivers by vehicle type
    let availableDrivers = MOCK_DRIVERS.filter(d => 
      d.isOnline && d.vehicle.type === vehicleType.toLowerCase()
    );
    
    // If no exact match, get any available driver
    if (availableDrivers.length === 0) {
      availableDrivers = MOCK_DRIVERS.filter(d => d.isOnline);
    }
    
    if (availableDrivers.length === 0) return null;
    
    // Sort by distance and return closest
    availableDrivers.sort((a, b) => a.distance - b.distance);
    return availableDrivers[0];
  },
  
  async getDriverById(driverId: string): Promise<Driver | null> {
    return MOCK_DRIVERS.find(d => d.id === driverId) || null;
  },
  
  async getAllDrivers(): Promise<Driver[]> {
    return MOCK_DRIVERS;
  },
};