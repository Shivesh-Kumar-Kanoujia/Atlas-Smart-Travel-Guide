export interface ExpenseItem {
  id?: string;
  category: string;
  description: string;
  amount: number;
  date?: string;
}

export interface PackingItem {
  id?: string;
  item: string;
  packed: boolean;
  category?: string;
}

export interface Trip {
  id: number;
  user_id: string;
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  budget: number;
  spent: number;
  notes?: string;
  packing_list: PackingItem[];
  expenses: ExpenseItem[];
  status: string;
  latitude?: number;
  longitude?: number;
  itinerary?: ItineraryItem[];
  created_at: string;
}

export interface TripCreate {
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  notes?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
}

export interface TripUpdate {
  name?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  spent?: number;
  notes?: string;
  packing_list?: PackingItem[];
  expenses?: ExpenseItem[];
  status?: string;
  latitude?: number;
  longitude?: number;
}

export interface ItineraryItem {
  id?: number;
  trip_id?: number;
  day_number: number;
  start_time?: string;
  end_time?: string;
  title: string;
  description?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  estimated_cost?: number;
  currency?: string;
  booking_url?: string;
  notes?: string;
  ai_generated?: boolean;
  created_at?: string;
}

export interface BudgetItem {
  id?: number;
  trip_id?: number;
  category: string;
  subcategory?: string;
  estimated_amount?: number;
  actual_amount?: number;
  currency?: string;
  ai_estimated?: boolean;
  created_at?: string;
}