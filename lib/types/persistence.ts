export type SavedPlaceCategory = "hotels" | "flights" | "recs"

export type SavedPlace = {
  id: string
  user_id: string
  category: SavedPlaceCategory
  external_id: string
  title: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  home_location: string | null
  travel_style: string | null
  currency: string | null
  theme: "light" | "dark" | "system" | null
  countries_visited: string[] | null
  notifications: {
    tripUpdates?: boolean
    planningComplete?: boolean
    budgetAlerts?: boolean
  } | null
  created_at: string
  updated_at: string
}
