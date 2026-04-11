import { useState } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";
import ChatBox from "../components/ChatBox";
import TripManager from "../components/TripManager";
import WeatherWidget from "../components/WeatherWidget";
import CurrencyConverter from "../components/CurrencyConverter";
import ImageAnalyzer from "../components/ImageAnalyzer";
import EmergencyInfo from "../components/EmergencyInfo";

const HERO = {
  chat:      { title: "Ask Atlas Anything",  sub: "Your AI travel companion powered by Groq + LLaMA" },
  trips:     { title: "My Adventures",       sub: "Plan, track budgets, and manage your packing lists" },
  weather:   { title: "Weather Forecast",    sub: "Check conditions before you pack" },
  currency:  { title: "Currency Converter",  sub: "Know your budget in any currency" },
  images:    { title: "Travel Image AI",     sub: "Upload a photo — AI identifies destinations & gives tips" },
  emergency: { title: "Stay Safe",           sub: "Emergency numbers and safety info for any destination" },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const { title, sub } = HERO[activeTab];

  return (
    <>
      <Head>
        <title>Atlas — Smart Travel Guide</title>
        <meta name="description" content="AI-powered travel companion for smart explorers" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-sand-50">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="bg-gradient-to-r from-sand-600 via-sand-700 to-sand-800 py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-display text-3xl font-semibold text-white animate-fade-in">{title}</h1>
            <p className="text-sand-300 mt-1 text-sm">{sub}</p>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {activeTab === "chat"      && <ChatBox />}
          {activeTab === "trips"     && <TripManager />}
          {activeTab === "weather"   && <WeatherWidget />}
          {activeTab === "currency"  && <CurrencyConverter />}
          {activeTab === "images"    && <ImageAnalyzer />}
          {activeTab === "emergency" && <EmergencyInfo />}
        </main>

        <footer className="text-center py-6 text-xs text-sand-400 border-t border-sand-200 mt-4">
          Atlas Travel AI · Powered by <span className="font-medium text-sand-500">Groq LLaMA</span> · Built with Next.js + FastAPI
        </footer>
      </div>
    </>
  );
}
