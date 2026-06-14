export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  plan: string;
  travel_memory: string;
  created_at: string;
  last_login: string;
}