export type UserRole = 'client' | 'developer'
export type RequestStatus = 'open' | 'expired' | 'awarded' | 'completed' | 'cancelled'

export interface Profile {
  id: string
  email: string
  name: string | null
  role: UserRole | null
  bio: string | null
  portfolio_url: string | null
  created_at: string
  updated_at: string
}

export interface Request {
  id: string
  client_id: string
  title: string
  description: string
  budget_min: number
  budget_max: number
  deadline: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
  expires_at: string
  awarded_at: string | null
  // Joined data
  client?: Profile
  bids?: Bid[]
  bid_count?: number
}

export interface Bid {
  id: string
  request_id: string
  developer_id: string
  price: number
  message: string | null
  estimated_days: number | null
  is_selected: boolean
  selected_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  developer?: Profile
  request?: Request
}

// Form types
export interface CreateRequestForm {
  title: string
  description: string
  budget_min: number
  budget_max: number
  deadline?: string
}

export interface CreateBidForm {
  price: number
  message?: string
  estimated_days?: number
}

export interface UpdateProfileForm {
  name: string
  role: UserRole
  bio?: string
  portfolio_url?: string
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      requests: {
        Row: Request
        Insert: Omit<Request, 'id' | 'created_at' | 'updated_at' | 'expires_at' | 'awarded_at' | 'client' | 'bids' | 'bid_count'>
        Update: Partial<Omit<Request, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'client' | 'bids' | 'bid_count'>>
      }
      bids: {
        Row: Bid
        Insert: Omit<Bid, 'id' | 'created_at' | 'updated_at' | 'is_selected' | 'selected_at' | 'developer' | 'request'>
        Update: Partial<Omit<Bid, 'id' | 'request_id' | 'developer_id' | 'created_at' | 'updated_at' | 'developer' | 'request'>>
      }
    }
  }
}
