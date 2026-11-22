import {PrayerCalculationMethodId} from '../types/quran';

export interface CityPreset {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  defaultMethod: PrayerCalculationMethodId;
}

export const OFFLINE_CITIES: CityPreset[] = [
  {name: 'Makkah', country: 'Saudi Arabia', latitude: 21.4225, longitude: 39.8262, defaultMethod: 'UmmAlQura'},
  {name: 'Madinah', country: 'Saudi Arabia', latitude: 24.4672, longitude: 39.6111, defaultMethod: 'UmmAlQura'},
  {name: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, defaultMethod: 'Karachi'},
  {name: 'Chittagong', country: 'Bangladesh', latitude: 22.3569, longitude: 91.7832, defaultMethod: 'Karachi'},
  {name: 'Sylhet', country: 'Bangladesh', latitude: 24.8949, longitude: 91.8687, defaultMethod: 'Karachi'},
  {name: 'Riyadh', country: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, defaultMethod: 'UmmAlQura'},
  {name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, defaultMethod: 'Egyptian'},
  {name: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, defaultMethod: 'Turkey'},
  {name: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, defaultMethod: 'Dubai'},
  {name: 'Kuala Lumpur', country: 'Malaysia', latitude: 3.139, longitude: 101.6869, defaultMethod: 'Singapore'},
  {name: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456, defaultMethod: 'Singapore'},
  {name: 'Karachi', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, defaultMethod: 'Karachi'},
  {name: 'Lahore', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, defaultMethod: 'Karachi'},
  {name: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, defaultMethod: 'MuslimWorldLeague'},
  {name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, defaultMethod: 'MuslimWorldLeague'},
  {name: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.006, defaultMethod: 'NorthAmerica'},
  {name: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, defaultMethod: 'NorthAmerica'},
  {name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, defaultMethod: 'Singapore'},
  {name: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.531, defaultMethod: 'Qatar'},
  {name: 'Kuwait City', country: 'Kuwait', latitude: 29.3759, longitude: 47.9774, defaultMethod: 'Kuwait'},
];
