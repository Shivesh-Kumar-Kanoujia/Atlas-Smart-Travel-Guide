import { useState } from 'react';
import Head from 'next/head';
import AppLayout from '../components/layout/AppLayout';
import ChatBox from '../components/ChatBox';
import TripManager from '../components/TripManager';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import WeatherWidget from '../components/WeatherWidget';
import CurrencyConverter from '../components/CurrencyConverter';
import ImageAnalyzer from '../components/ImageAnalyzer';
import EmergencyInfo from '../components/EmergencyInfo';
import MapTab from '../components/MapTab';
import PreferenceSettings from '../components/PreferenceSettings';
import RecommendationsPanel from '../components/RecommendationsPanel';

type TabKey = 'chat' | 'trips' | 'analytics' | 'weather' | 'currency' | 'images' | 'emergency' | 'map' | 'preferences';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const handleTabChange = (tab: string) => setActiveTab(tab as TabKey);

  return (
    <>
      <Head>
        <title>Atlas — Smart Travel Guide</title>
        <meta name="description" content="AI-powered travel companion for smart explorers — plan trips, track budgets, get AI recommendations, and stay safe anywhere in the world." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Atlas — Smart Travel Guide" />
        <meta property="og:description" content="AI-powered travel companion for smart explorers — plan trips, track budgets, get AI recommendations, and stay safe anywhere in the world." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://atlas-travel.vercel.app" />
        <meta property="og:image" content="https://atlas-travel.vercel.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Atlas — Smart Travel Guide" />
        <meta name="twitter:description" content="AI-powered travel companion for smart explorers." />
        <link rel="canonical" href="https://atlas-travel.vercel.app" />
      </Head>

      <AppLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'chat' && <ChatBox />}
        {activeTab === 'trips' && <TripManager />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'weather' && <WeatherWidget />}
        {activeTab === 'currency' && <CurrencyConverter />}
        {activeTab === 'images' && <ImageAnalyzer />}
        {activeTab === 'emergency' && <EmergencyInfo />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'preferences' && (
          <div className="space-y-8">
            <RecommendationsPanel />
            <div className="border-t border-border pt-8">
              <PreferenceSettings />
            </div>
          </div>
        )}
      </AppLayout>
    </>
  );
}
