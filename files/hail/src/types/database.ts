// Hand-written to match supabase/schema.sql. Replace with generated types: `npm run db:types`.
export type UserRoleE = 'passenger' | 'driver' | 'admin';
export type RideStatusE = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
export type VehicleTypeE = 'economy' | 'comfort' | 'xl' | 'bike';
export type DocumentTypeE = 'drivers_license' | 'vehicle_registration' | 'insurance' | 'id_card';
export type DocumentStatusE = 'pending' | 'approved' | 'rejected';

type ProfileRow = {
  id: string; role: UserRoleE; full_name: string | null; phone: string | null; avatar_url: string | null;
  is_online: boolean; is_approved: boolean; created_at: string; updated_at: string;
};
type VehicleRow = {
  id: string; driver_id: string; vehicle_type: VehicleTypeE; make: string; model: string;
  year: number | null; plate: string; color: string | null; is_active: boolean; created_at: string;
};
type DocumentRow = {
  id: string; driver_id: string; doc_type: DocumentTypeE; file_path: string; status: DocumentStatusE;
  rejection_reason: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string;
};
type FareRuleRow = {
  id: string; vehicle_type: VehicleTypeE; base_fare: number; per_km: number; per_minute: number;
  minimum_fare: number; surge_multiplier: number; currency: string; is_active: boolean; updated_at: string;
};
type RideRow = {
  id: string; passenger_id: string; driver_id: string | null; vehicle_id: string | null;
  vehicle_type: VehicleTypeE; status: RideStatusE;
  pickup_lat: number; pickup_lng: number; pickup_address: string | null; pickup_geo: unknown;
  dropoff_lat: number; dropoff_lng: number; dropoff_address: string | null; dropoff_geo: unknown;
  distance_m: number; duration_s: number; fare_estimate: number; fare_final: number | null; currency: string;
  requested_at: string; accepted_at: string | null; arrived_at: string | null; started_at: string | null;
  completed_at: string | null; cancelled_at: string | null; cancelled_by: string | null; cancel_reason: string | null;
};
type LocationRow = {
  user_id: string; lat: number; lng: number; heading: number | null; speed: number | null;
  accuracy: number | null; geom: unknown; recorded_at: string;
};
type SosRow = {
  id: string; user_id: string; ride_id: string | null; lat: number | null; lng: number | null;
  created_at: string; resolved_at: string | null; resolved_by: string | null;
};

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      vehicles: Table<VehicleRow>;
      driver_documents: Table<DocumentRow>;
      fare_rules: Table<FareRuleRow>;
      rides: Table<RideRow>;
      locations: Table<LocationRow>;
      sos_events: Table<SosRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      estimate_fare: {
        Args: { p_distance_m: number; p_duration_s: number; p_vehicle_type?: VehicleTypeE };
        Returns: { fare: number; currency: string; surge_multiplier: number }[];
      };
      request_ride: {
        Args: {
          p_pickup_lat: number; p_pickup_lng: number; p_pickup_address: string;
          p_dropoff_lat: number; p_dropoff_lng: number; p_dropoff_address: string;
          p_distance_m: number; p_duration_s: number; p_vehicle_type?: VehicleTypeE;
        };
        Returns: RideRow;
      };
      accept_ride: { Args: { p_ride_id: string }; Returns: RideRow };
      set_ride_status: { Args: { p_ride_id: string; p_status: RideStatusE; p_reason?: string }; Returns: RideRow };
      nearby_drivers: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number };
        Returns: { driver_id: string; lat: number; lng: number; heading: number | null; distance_m: number }[];
      };
      driver_earnings: {
        Args: { p_days?: number };
        Returns: { day: string; trips: number; total: number }[];
      };
    };
    Enums: {
      user_role: UserRoleE; ride_status: RideStatusE; vehicle_type: VehicleTypeE;
      document_type: DocumentTypeE; document_status: DocumentStatusE;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
