// services/bookingService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKINGS_KEY = '@user_bookings';

export interface DriverDetails {
  id: string;
  name: string;
  phone: string;
  photo: string;
  vehicle: string;
  vehicleNumber: string;
  vehicleColor: string;
  rating: number;
  totalRides: number;
  eta: number;
}

export interface Booking {
  id: string;
  bookingId: string;
  type: string;
  vehicleType: string;
  vehicleName: string;
  date: string;
  time: string;
  from: string;
  to: string;
  pickupLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  price: number;
  fare: number;
  driver?: DriverDetails;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  estimatedArrival?: string;
  distance: string;
  duration: number;
  surgeMultiplier: number;
  paymentMethod?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const bookingService = {
  async saveBooking(booking: Omit<Booking, 'id' | 'bookingId' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    try {
      const existing = await AsyncStorage.getItem(BOOKINGS_KEY);
      const bookings: Booking[] = existing ? JSON.parse(existing) : [];
      
      const newBooking: Booking = {
        ...booking,
        id: Date.now().toString(),
        bookingId: `RIDE${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      bookings.unshift(newBooking);
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
      
      return newBooking;
    } catch (error) {
      console.error('Error saving booking:', error);
      throw error;
    }
  },
  
  async getBookings(): Promise<Booking[]> {
    try {
      const existing = await AsyncStorage.getItem(BOOKINGS_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  },
  
  async getBookingById(id: string): Promise<Booking | null> {
    const bookings = await this.getBookings();
    return bookings.find(b => b.id === id) || null;
  },
  
  async updateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
    try {
      const bookings = await this.getBookings();
      const index = bookings.findIndex(b => b.id === id);
      
      if (index === -1) return false;
      
      bookings[index] = { ...bookings[index], ...updates, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
      return true;
    } catch (error) {
      console.error('Error updating booking:', error);
      return false;
    }
  },
  
  async assignDriverToBooking(bookingId: string, driver: DriverDetails): Promise<boolean> {
    return this.updateBooking(bookingId, {
      driver,
      status: 'confirmed',
      estimatedArrival: `${driver.eta} min`,
      updatedAt: new Date().toISOString(),
    });
  },
  
  async updateBookingStatus(id: string, status: Booking['status'], reason?: string): Promise<boolean> {
    try {
      const bookings = await this.getBookings();
      const index = bookings.findIndex(b => b.id === id);
      
      if (index === -1) return false;
      
      bookings[index].status = status;
      bookings[index].updatedAt = new Date().toISOString();
      if (reason) (bookings[index] as any).cancelledReason = reason;
      if (status === 'cancelled') (bookings[index] as any).cancelledAt = new Date().toISOString();
      
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
      return true;
    } catch (error) {
      console.error('Error updating booking:', error);
      return false;
    }
  },
  
  async cancelBooking(id: string, reason?: string): Promise<boolean> {
    return this.updateBookingStatus(id, 'cancelled', reason || 'Cancelled by user');
  },
};