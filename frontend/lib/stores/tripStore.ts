import { create } from 'zustand';
import type { Trip, PackingItem, ExpenseItem } from '@/types';

interface TripState {
  trips: Trip[];
  selectedTrip: Trip | null;
  isLoading: boolean;
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: number, data: Partial<Trip>) => void;
  removeTrip: (id: number) => void;
  setSelectedTrip: (trip: Trip | null) => void;
  setLoading: (loading: boolean) => void;
  addExpense: (tripId: number, expense: ExpenseItem) => void;
  updatePacking: (tripId: number, items: PackingItem[]) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  selectedTrip: null,
  isLoading: false,
  setTrips: (trips) => set({ trips }),
  addTrip: (trip) => set((state) => ({ trips: [trip, ...state.trips] })),
  updateTrip: (id, data) =>
    set((state) => ({
      trips: state.trips.map((t) => (t.id === id ? { ...t, ...data } : t)),
      selectedTrip: state.selectedTrip?.id === id ? { ...state.selectedTrip, ...data } : state.selectedTrip,
    })),
  removeTrip: (id) =>
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== id),
      selectedTrip: state.selectedTrip?.id === id ? null : state.selectedTrip,
    })),
  setSelectedTrip: (trip) => set({ selectedTrip: trip }),
  setLoading: (loading) => set({ isLoading: loading }),
  addExpense: (tripId, expense) =>
    set((state) => ({
      trips: state.trips.map((t) =>
        t.id === tripId ? { ...t, expenses: [...t.expenses, expense] } : t
      ),
    })),
  updatePacking: (tripId, items) =>
    set((state) => ({
      trips: state.trips.map((t) => (t.id === tripId ? { ...t, packing_list: items } : t)),
    })),
}));