export interface TripRequirements {
  /** Kept for the quick destination field used in recommendation screens. */
  destination: string
  /** A short free-form summary shown throughout the prototype. */
  preferences: string
  from: string
  to: string
  startDate: string
  endDate: string
  travelers: number
  tripType: string
  budget: number
  currency: string
  budgetCategory: string
  interests: string[]
  travelPace: string
  accommodation: string
  transportation: string
  foodPreferences: string[]
  specialRequirements: string
}

export const initialRequirements: TripRequirements = {
  destination: "Tokyo, Japan",
  preferences: "Culture, food, technology, and a balanced pace.",
  from: "Mumbai (BOM)",
  to: "Tokyo (NRT)",
  startDate: "2026-09-15",
  endDate: "2026-09-20",
  travelers: 2,
  tripType: "Couple",
  budget: 200000,
  currency: "INR",
  budgetCategory: "Moderate",
  interests: ["Culture", "Food", "Technology", "Nature"],
  travelPace: "Balanced",
  accommodation: "4 Star Hotel",
  transportation: "Balanced",
  foodPreferences: ["Local Food", "Non-Vegetarian", "Street Food"],
  specialRequirements: "I want to experience local culture and anime attractions but avoid very expensive activities."
}

export interface AgentActivityLog {
  timestamp: string
  agent: 'Supervisor' | 'Logistics' | 'Recommendations' | 'Budget'
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'negotiation'
  round?: number
}

export const mockAgentLogs: AgentActivityLog[] = [
  { timestamp: "10:30:12", agent: "Supervisor", message: "Received trip requirements. Initiating planning process for 2 travelers to Tokyo.", type: "info" },
  { timestamp: "10:30:14", agent: "Logistics", message: "Analyzing direct flight routes from Mumbai (BOM) to Tokyo (NRT/HND). Found 3 airlines.", type: "info" },
  { timestamp: "10:30:16", agent: "Recommendations", message: "Scanning properties in Tokyo. Searching for 4 Star Hotels near Shibuya/Shinjuku with excellent public transit access.", type: "info" },
  { timestamp: "10:30:18", agent: "Recommendations", message: "Identified Sakura Grand Hotel (Shinjuku) and Tokyo Central Boutique (Shibuya). Selecting premium options.", type: "info" },
  { timestamp: "10:30:21", agent: "Budget", message: "Calculating initial cost projection. Flight: ₹96,000 (direct), Hotel (Sakura Grand): ₹60,000, Activities: ₹40,000, Food: ₹30,000. Total: ₹2,26,000.", type: "info" },
  { timestamp: "10:30:23", agent: "Budget", message: "BUDGET ALERT: Cost of ₹2,26,000 exceeds target budget limit of ₹2,00,000 by ₹26,000.", type: "error" },
  { timestamp: "10:30:25", agent: "Supervisor", message: "Entering negotiation loop (Round 1). Logistics and Recommendations Agents requested to search for cost-saving alternatives.", type: "negotiation", round: 1 },
  { timestamp: "10:30:28", agent: "Logistics", message: "Re-scanning flights. Selected Air India AI302 (direct flight at special rate, ₹48,000 per person). Total flights: ₹96,000 (cannot segment lower without layovers).", type: "warning", round: 1 },
  { timestamp: "10:30:31", agent: "Recommendations", message: "Alternative hotel proposed: Tokyo Central Boutique Hotel. Average rate of ₹6,800/night. 5-night total: ₹34,000 (Saved ₹26,000). Proximity to Shibuya: 2 km.", type: "success", round: 1 },
  { timestamp: "10:30:35", agent: "Budget", message: "Recalculating with Tokyo Central Boutique Hotel. Flights: ₹96,000, Hotel: ₹34,000, Food: ₹25,000, Activities: ₹20,000, Transport: ₹8,000, Miscellaneous: ₹10,000. Total Projected Cost: ₹1,93,000.", type: "info", round: 1 },
  { timestamp: "10:30:38", agent: "Budget", message: "BUDGET APPROVED. Estimated total cost of ₹1,93,000 satisfies target threshold of ₹2,00,000.", type: "success", round: 1 },
  { timestamp: "10:30:42", agent: "Supervisor", message: "Consensus reached in Round 1. Compiling final day-wise experience cards and logistics path.", type: "success" },
  { timestamp: "10:30:45", agent: "Supervisor", message: "Optimized itinerary successfully generated and verified. Interactive dashboards ready.", type: "success" }
]

export interface NegotiationMessage {
  id: string
  agent: 'Supervisor' | 'Logistics' | 'Recommendations' | 'Budget'
  message: string
  status?: 'APPROVED' | 'REJECTED' | 'PROPOSED' | 'CONSENSUS'
  details?: Record<string, string | number>
}

export const mockNegotiations: NegotiationMessage[] = [
  {
    id: "neg-1",
    agent: "Logistics",
    message: "I recommend Air India Flight AI302 (Direct) from Mumbai to Tokyo. It is the most convenient option with zero layovers, minimizing total travel duration.",
    status: "PROPOSED",
    details: { "Flight Cost": "₹48,000 / person", "Total Cost": "₹96,000", "Duration": "8h 30m" }
  },
  {
    id: "neg-2",
    agent: "Recommendations",
    message: "I recommend Sakura Grand Hotel (Shinjuku). It has an 8.9 rating, premium amenities, easy train access, and places the travelers right in the heart of Tokyo.",
    status: "PROPOSED",
    details: { "Price/Night": "₹12,000", "Total (5 Nights)": "₹60,000", "Rating": "★★★★☆" }
  },
  {
    id: "neg-3",
    agent: "Budget",
    message: "PROPOSAL REJECTED. The current itinerary total of ₹2,26,000 exceeds our user's maximum budget of ₹2,00,000. We must find accommodation under ₹7,000/night to maintain safety buffers.",
    status: "REJECTED",
    details: { "Exceeded By": "₹26,000", "Target Budget": "₹2,00,000", "Recommended Cap": "₹7,000/night" }
  },
  {
    id: "neg-4",
    agent: "Supervisor",
    message: "Requesting alternative hotel recommendations from Recommendations Agent while keeping convenience high. Logistics Agent, please lock in the Air India direct flight as flights are highly volatile.",
    status: "PROPOSED"
  },
  {
    id: "neg-5",
    agent: "Recommendations",
    message: "Alternative found: Tokyo Central Boutique Hotel (Shibuya). High 4.3 rating, direct metro access, modern design, costing ₹6,800/night (Total: ₹34,000).",
    status: "PROPOSED",
    details: { "Price/Night": "₹6,800", "Total (5 Nights)": "₹34,000", "Difference": "-₹26,000" }
  },
  {
    id: "neg-6",
    agent: "Budget",
    message: "PROPOSAL APPROVED. Total cost is now ₹1,93,000, leaving a remaining safety margin of ₹7,000 (₹55,000 total unspent). Price limits and buffers have been successfully validated.",
    status: "APPROVED",
    details: { "New Total": "₹1,93,000", "Savings": "₹33,000 vs peak", "Remaining Buffer": "₹55,000" }
  },
  {
    id: "neg-7",
    agent: "Supervisor",
    message: "Consensus reached. Tokyo Central Boutique Hotel and Air India AI302 flight have been integrated into the optimized itinerary.",
    status: "CONSENSUS"
  }
]

export const mockFlights = [
  {
    id: "flight-1",
    airline: "Air India",
    logo: "✈️",
    flightNumber: "AI302",
    from: "Mumbai (BOM)",
    to: "Tokyo (NRT)",
    departure: "08:30",
    arrival: "18:00",
    duration: "8h 30m",
    stops: "Direct",
    price: 48000,
    badge: "Best Value",
    selected: true
  },
  {
    id: "flight-2",
    airline: "Singapore Airlines",
    logo: "🇸🇬",
    flightNumber: "SQ421 -> SQ638",
    from: "Mumbai (BOM)",
    to: "Tokyo (HND)",
    departure: "11:45",
    arrival: "22:15",
    duration: "10h 30m",
    stops: "1 Stop (SIN)",
    price: 39000,
    badge: "Cheapest",
    selected: false
  },
  {
    id: "flight-3",
    airline: "Japan Airlines",
    logo: "🇯🇵",
    flightNumber: "JL728",
    from: "Mumbai (BOM)",
    to: "Tokyo (NRT)",
    departure: "19:00",
    arrival: "06:30 (+1)",
    duration: "8h 00m",
    stops: "Direct",
    price: 68000,
    badge: "Fastest",
    selected: false
  }
]

export const mockHotels = [
  {
    id: "hotel-1",
    name: "Tokyo Central Boutique Hotel",
    rating: 4.3,
    location: "Shibuya, Tokyo",
    pricePerNight: 6800,
    totalPrice: 34000,
    distance: "1.2 km from main Shibuya station",
    amenities: ["Free WiFi", "Japanese Breakfast", "Fitness Studio", "Metro Proximity"],
    image: "🏙️",
    badge: "Selected",
    selected: true
  },
  {
    id: "hotel-2",
    name: "Sakura Grand Hotel & Spa",
    rating: 4.8,
    location: "Shinjuku, Tokyo",
    pricePerNight: 12000,
    totalPrice: 60000,
    distance: "0.5 km from Shinjuku Station",
    amenities: ["Spa & Onsen", "City View Skylounge", "Rooftop Pool", "English concierge"],
    image: "🏨",
    badge: "Premium Option",
    selected: false
  },
  {
    id: "hotel-3",
    name: "Capsule & Pod Station Hotel",
    rating: 4.0,
    location: "Akihabara, Tokyo",
    pricePerNight: 2800,
    totalPrice: 14000,
    distance: "0.2 km from Akihabara Station",
    amenities: ["Free High-speed WiFi", "Sauna & Spa", "Co-working Lounge"],
    image: "🛖",
    badge: "Ultra Budget",
    selected: false
  }
]

export const mockRecommendations = [
  {
    id: "rec-1",
    name: "Sensoji Temple & Nakamise District",
    category: "Culture",
    rating: 4.8,
    location: "Asakusa",
    cost: "Free",
    duration: "2 hours",
    bestTime: "Early Morning (8:00 AM)",
    image: "🏮",
    description: "Tokyo's oldest and most iconic ancient Buddhist temple. Stroll down Nakamise shopping street for traditional souvenirs and delicious street food."
  },
  {
    id: "rec-2",
    name: "Shibuya Crossing & Hachiko Statue",
    category: "Attractions",
    rating: 4.7,
    location: "Shibuya",
    cost: "Free",
    duration: "1 hour",
    bestTime: "Dusk / Nighttime",
    image: "🚦",
    description: "Experience the world's busiest pedestrian intersection. Make sure to pay respects to the loyal Hachiko dog statue nearby."
  },
  {
    id: "rec-3",
    name: "Akihabara Electric Town",
    category: "Shopping",
    rating: 4.6,
    location: "Akihabara",
    cost: "Varies",
    duration: "3 hours",
    bestTime: "Afternoon",
    image: "🎮",
    description: "The global hub of anime, gaming, electronics, and manga culture. Visit multi-floor retro arcade game stores and themed cafes."
  },
  {
    id: "rec-4",
    name: "Meiji Jingu Shrine & Yoyogi Park",
    category: "Nature",
    rating: 4.8,
    location: "Harajuku",
    cost: "Free",
    duration: "1.5 hours",
    bestTime: "Morning",
    image: "🌲",
    description: "A serene forest oasis containing a historical Shinto shrine dedicated to Emperor Meiji, located right next to bustling Harajuku."
  },
  {
    id: "rec-5",
    name: "Shinjuku Omoide Yokocho (Alleyway Dining)",
    category: "Nightlife",
    rating: 4.5,
    location: "Shinjuku",
    cost: "₹1,500 - ₹3,000",
    duration: "2 hours",
    bestTime: "Evening (7:00 PM)",
    image: "🍢",
    description: "Step back in time inside narrow alleys lined with tiny bars serving delicious grilled yakitori and local drinks."
  },
  {
    id: "rec-6",
    name: "Museum of Digital Art (teamLab Planets)",
    category: "Hidden Gems",
    rating: 4.9,
    location: "Toyosu",
    cost: "₹2,200",
    duration: "2 hours",
    bestTime: "Mid-day (Book in advance)",
    image: "✨",
    description: "An incredible body-immersive, digital-art wonderland where you walk through water and massive projection rooms."
  }
]

export const mockDayPlans = [
  {
    day: 1,
    theme: "Arrival & Neon Shibuya Night",
    events: [
      {
        time: "18:00",
        title: "Arrive at Tokyo Narita Airport (NRT)",
        description: "Cleared customs, collect baggage. Supervisor Agent arranged airport taxi pickup.",
        location: "Terminal 2, Narita NRT",
        cost: "₹8,000 (Taxi Service)",
        travelTime: "75 mins to Shibuya",
        icon: "✈️"
      },
      {
        time: "19:30",
        title: "Check into Tokyo Central Boutique Hotel",
        description: "Verify check-in, unpack bags. Welcome refreshments in lobby. Local Recommendations Agent locked base.",
        location: "Shibuya District",
        cost: "Checked In",
        travelTime: "5 mins walk",
        icon: "🏨"
      },
      {
        time: "20:30",
        title: "Shibuya Crossing & Dinner at local ramen shop",
        description: "Experience the brilliant lights of Shibuya Crossing. Eat award-winning Tonkotsu ramen nearby.",
        location: "Shibuya Crossing",
        cost: "₹2,200 (Dinner)",
        travelTime: "15 mins walk",
        icon: "🍜"
      }
    ]
  },
  {
    day: 2,
    theme: "Historical Asakusa & Akihabara Otaku Culture",
    events: [
      {
        time: "09:00",
        title: "Explore Sensoji Temple & Traditional Nakamise Street",
        description: "Explore Asakusa's historic core. Recommended by Recommendations Agent to beat midday crowds.",
        location: "Asakusa",
        cost: "Free",
        travelTime: "25 mins via Metro Ginza Line",
        icon: "🏮"
      },
      {
        time: "13:00",
        title: "Lunch at local Tempura House",
        description: "Traditional crunchy tempura bowls. Highly rated, budget-approved.",
        location: "Asakusa district",
        cost: "₹1,800",
        travelTime: "10 mins transport",
        icon: "🍛"
      },
      {
        time: "14:30",
        title: "Akihabara Electronics & Gaming Walk",
        description: "Explore retro-gaming shops, anime hubs, and multi-story gadget stores.",
        location: "Akihabara Electric Town",
        cost: "Free (Sightseeing)",
        travelTime: "15 min Metro ride",
        icon: "🎮"
      },
      {
        time: "19:00",
        title: "Japanese Izakaya Dining Experience",
        description: "Enjoy shared plates of yakitori, gyoza, and local specialty beverages.",
        location: "Shinjuku district",
        cost: "₹3,500",
        travelTime: "20 mins",
        icon: "🍢"
      }
    ]
  },
  {
    day: 3,
    theme: "Serene Nature & High Modern Art",
    events: [
      {
        time: "09:30",
        title: "Meiji Jingu Shrine & Yoyogi Park Oasis",
        description: "Peaceful morning walk through a giant forest surrounding a magnificent old wooden Torii gate.",
        location: "Harajuku district",
        cost: "Free",
        travelTime: "10 mins walk from Hotel",
        icon: "🌲"
      },
      {
        time: "12:00",
        title: "Lunch & Shopping on Harajuku Takeshita Street",
        description: "Colorful Japanese crepes and pop-culture shopping. Dynamic food environment.",
        location: "Harajuku Takeshita-dori",
        cost: "₹1,500",
        travelTime: "5 mins walk",
        icon: "🥞"
      },
      {
        time: "14:00",
        title: "teamLab Planets Digital Art Museum",
        description: "Walk inside water gardens, mirror mazes and giant digital flower projections.",
        location: "Toyosu, Tokyo",
        cost: "₹4,400 (Entry for two)",
        travelTime: "30 mins Tokyo metro transit",
        icon: "✨"
      },
      {
        time: "18:30",
        title: "Observation Deck at Shibuya Sky & Dinner",
        description: "Stunning 360-degree sunset and night view overlooking the entire Tokyo skyline and Mount Fuji.",
        location: "Shibuya Scramble Square",
        cost: "₹4,000 (Shibuya Sky tickets)",
        travelTime: "20 mins return transport",
        icon: "🏙️"
      }
    ]
  },
  {
    day: 4,
    theme: "Day Trip to Mount Fuji (Hakone)",
    events: [
      {
        time: "07:30",
        title: "Bullet Train transfer to Hakone",
        description: "Board the romancecar transit from Shinjuku, Logistics agent selected comfortable express line.",
        location: "Shinjuku Station to Hakone",
        cost: "₹4,800 (Return tickets)",
        travelTime: "85 mins",
        icon: "🚝"
      },
      {
        time: "10:00",
        title: "Hakone Ropeway & Lake Ashi Cruise",
        description: "Views of Mt. Fuji. Ride the cable cars over volcanic sulfur vents (Owakudani) and cruise the lake on a pirate ship.",
        location: "Lake Ashi, Hakone",
        cost: "₹3,500",
        travelTime: "Local cable cars",
        icon: "🚢"
      },
      {
        time: "13:30",
        title: "Authentic Soba Lunch & Onsen Hot Springs",
        description: "Dip in private hot spring baths containing mineral volcanic water, followed by fresh cold buckwheat noodles.",
        location: "Hakone Village",
        cost: "₹6,000 (Bath & Food)",
        travelTime: "Local transfers",
        icon: "🛁"
      },
      {
        time: "19:00",
        title: "Return to Tokyo & Casual Sushi Dining",
        description: "Head back to Shibuya, end the night choosing items off a conveyor belt sushi system.",
        location: "Shibuya",
        cost: "₹3,800",
        travelTime: "85 mins Romancecar",
        icon: "🍣"
      }
    ]
  },
  {
    day: 5,
    theme: "Final Departure & Gift Hunting",
    events: [
      {
        time: "10:00",
        title: "Gift Hunting at Don Quijote Shibuya",
        description: "Shop for matcha KitKats, local stationery, skincare items, and cute souvenirs.",
        location: "Shibuya Mega Donki",
        cost: "₹5,000 (Miscellaneous)",
        travelTime: "5 mins walk",
        icon: "🎁"
      },
      {
        time: "13:00",
        title: "Last Meal: Traditional Wagyu Beef Bowl",
        description: "Savor a premium, quick Wagyu lunch at an agent-recommended low-cost street diner.",
        location: "Shibuya",
        cost: "₹2,500",
        travelTime: "10 mins",
        icon: "🥩"
      },
      {
        time: "14:30",
        title: "Transfer to Narita International Airport",
        description: "Take the Narita Express (N'EX) transit booked by Logistics agent.",
        location: "Shibuya Station to Narita Airport",
        cost: "₹3,200 (N'EX tickets)",
        travelTime: "70 mins train ride",
        icon: "🚆"
      },
      {
        time: "18:00",
        title: "Board Flight AI303 to Mumbai",
        description: "Successful wrap up of Tokyo trip. Budget Agent registers active balance sheets.",
        location: "Narita Airport",
        cost: "Pre-paid flight",
        travelTime: "Direct flight (8.5 hours)",
        icon: "🛫"
      }
    ]
  }
]

export const mockArchitectures = {
  frontend: "Next.js, React, Tailwind CSS",
  backend: "FastAPI / Node.js (placeholder)",
  orchestrator: "LangGraph Supervisor",
  models: "OpenAI GPT-4o / Google Gemini",
  database: "Supabase PostgreSQL",
  apis: ["Flight API", "Hotel API", "Google Maps", "Weather API"]
}

export const mockBudgetBreakdown = [
  { category: "Flights", amount: 48000 },
  { category: "Hotel", amount: 34000 },
  { category: "Food", amount: 25000 },
  { category: "Activities", amount: 20000 },
  { category: "Local Transport", amount: 8000 },
  { category: "Miscellaneous", amount: 10000 },
]

export const mockBudgetTotal = mockBudgetBreakdown.reduce((s, i) => s + i.amount, 0)
export const mockBudgetRemaining = 200000 - mockBudgetTotal

export const mockTrips = [
  {
    id: "tokyo",
    destination: "Tokyo Adventure",
    location: "Tokyo, Japan",
    dates: "15 Sep – 20 Sep, 2026",
    days: 5,
    budget: 200000,
    status: "Ready" as const,
    image: "🗼",
  },
  {
    id: "paris",
    destination: "Paris Getaway",
    location: "Paris, France",
    dates: "10 Oct – 17 Oct, 2026",
    days: 7,
    budget: 350000,
    status: "Draft" as const,
    image: "🗼",
  },
  {
    id: "goa",
    destination: "Goa Weekend",
    location: "Goa, India",
    dates: "12 May – 15 May, 2026",
    days: 3,
    budget: 45000,
    status: "Completed" as const,
    image: "🏖️",
  },
]

export const mockOptimizations = [
  {
    id: "opt-1",
    label: "Flight",
    current: "₹48,000 / person",
    alternative: "₹39,000 / person (1 stop)",
    savings: 9000,
  },
  {
    id: "opt-2",
    label: "Hotel",
    current: "₹12,000/night — Sakura Grand",
    alternative: "₹6,800/night — Tokyo Central Boutique",
    savings: 26000,
  },
]

export const mockMapPins = [
  { id: "airport", label: "NRT Airport", emoji: "✈️", top: "15%", left: "70%" },
  { id: "hotel", label: "Hotel", emoji: "🏨", top: "45%", left: "35%" },
  { id: "shibuya", label: "Shibuya", emoji: "🚦", top: "50%", left: "55%" },
  { id: "asakusa", label: "Asakusa", emoji: "🏮", top: "30%", left: "75%" },
  { id: "fuji", label: "Mt. Fuji", emoji: "🗻", top: "70%", left: "20%" },
]
