import { create } from 'zustand';
import type { VehicleType } from '@/types/domain';
import type { PlaceRef } from './api';

type DraftState = {
  pickup: PlaceRef | null;
  dropoff: PlaceRef | null;
  vehicleType: VehicleType;
  setPickup: (p: PlaceRef | null) => void;
  setDropoff: (p: PlaceRef | null) => void;
  setVehicleType: (t: VehicleType) => void;
  reset: () => void;
};

/** Local-only state for the ride being planned. Server state lives in React Query. */
export const useRideDraft = create<DraftState>((set) => ({
  pickup: null,
  dropoff: null,
  vehicleType: 'economy',
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setVehicleType: (vehicleType) => set({ vehicleType }),
  reset: () => set({ pickup: null, dropoff: null, vehicleType: 'economy' }),
}));
