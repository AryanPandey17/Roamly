"use client"

import { useApp } from "@/context/AppContext"
import LandingPage from "@/components/pages/LandingPage"
import LoginPage from "@/components/pages/LoginPage"
import SignupPage from "@/components/pages/SignupPage"
import ForgotPasswordPage from "@/components/pages/ForgotPasswordPage"
import DashboardPage from "@/components/pages/DashboardPage"
import PlanTripPage from "@/components/pages/PlanTripPage"
import PlanningProcessPage from "@/components/pages/PlanningProcessPage"
import NegotiationsPage from "@/components/pages/NegotiationsPage"
import ItineraryPage from "@/components/pages/ItineraryPage"
import FlightsPage from "@/components/pages/FlightsPage"
import AccommodationPage from "@/components/pages/AccommodationPage"
import LocalRecsPage from "@/components/pages/LocalRecsPage"
import BudgetInsightsPage from "@/components/pages/BudgetInsightsPage"
import AgentsPage from "@/components/pages/AgentsPage"
import ArchitecturePage from "@/components/pages/ArchitecturePage"
import MyTripsPage from "@/components/pages/MyTripsPage"
import SavedPage from "@/components/pages/SavedPage"
import ProfilePage from "@/components/pages/ProfilePage"
import SettingsPage from "@/components/pages/SettingsPage"
import AboutPage from "@/components/pages/AboutPage"

export default function Home() {
  const { activePage } = useApp()

  const renderPage = () => {
    switch (activePage) {
      case "landing":
        return <LandingPage />
      case "login":
        return <LoginPage />
      case "signup":
        return <SignupPage />
      case "forgot-password":
        return <ForgotPasswordPage />
      case "dashboard":
        return <DashboardPage />
      case "plan-trip":
        return <PlanTripPage />
      case "planning-process":
        return <PlanningProcessPage />
      case "negotiations":
        return <NegotiationsPage />
      case "itinerary":
        return <ItineraryPage />
      case "flights":
        return <FlightsPage />
      case "accommodation":
        return <AccommodationPage />
      case "local-recs":
        return <LocalRecsPage />
      case "budget-insights":
        return <BudgetInsightsPage />
      case "agents":
        return <AgentsPage />
      case "architecture":
        return <ArchitecturePage />
      case "my-trips":
        return <MyTripsPage />
      case "saved":
        return <SavedPage />
      case "profile":
        return <ProfilePage />
      case "settings":
        return <SettingsPage />
      case "about":
        return <AboutPage />
      default:
        return <LandingPage />
    }
  }

  return <main className="flex-1">{renderPage()}</main>
}
