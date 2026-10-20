import type { Database } from './database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Profile = Tables['profiles']['Row'];
export type Vehicle = Tables['vehicles']['Row'];
export type DriverDocument = Tables['driver_documents']['Row'];
export type FareRule = Tables['fare_rules']['Row'];
export type Ride = Tables['rides']['Row'];
export type LocationRow = Tables['locations']['Row'];
export type SosEvent = Tables['sos_events']['Row'];

export type UserRole = Enums['user_role'];
export type RideStatus = Enums['ride_status'];
export type VehicleType = Enums['vehicle_type'];
export type DocumentStatus = Enums['document_status'];

export type LatLng = { lat: number; lng: number };

export const ACTIVE_RIDE_STATUSES: RideStatus[] = ['pending', 'accepted', 'arrived', 'in_progress'];
export const DRIVER_ACTIVE_STATUSES: RideStatus[] = ['accepted', 'arrived', 'in_progress'];
export const VEHICLE_TYPES: VehicleType[] = ['economy', 'comfort', 'xl', 'bike'];

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  economy: 'Economy', comfort: 'Comfort', xl: 'XL', bike: 'Bike',
};
export const RIDE_STATUS_LABEL: Record<RideStatus, string> = {
  pending: 'Finding your driver',
  accepted: 'Driver is on the way',
  arrived: 'Your driver has arrived',
  in_progress: 'On your trip',
  completed: 'Trip completed',
  cancelled: 'Ride cancelled',
};
