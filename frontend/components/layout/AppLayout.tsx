import Sidebar, { NAV_ITEMS } from './Sidebar';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  activeTab: string;
  onTabChange: (tab: string, convId?: string) => void;
  children: ReactNode;
}



export default function AppLayout({ activeTab, onTabChange, children }: AppLayoutProps) {
  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      <div className="md:pl-56">
        {/* Top header bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 md:px-6 md:ml-0 ml-0">
          <div className="flex items-center gap-2">
            {currentNav && (
              <>
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center',
                    'bg-primary/10 text-primary'
                  )}
                >
                  <currentNav.icon className="w-4 h-4" />
                </div>
                <h1 className="font-display text-lg font-semibold text-foreground">
                  {currentNav.label}
                </h1>
              </>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
