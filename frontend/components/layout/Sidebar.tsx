import { MessageSquare, MapPin, CloudSun, ArrowRightLeft, Image, ShieldAlert, Map, BarChart3, Heart, LogOut, User, Menu, X, Compass, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import AuthModal from '../AuthModal';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: typeof MessageSquare;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'AI Guide', icon: MessageSquare },
  { id: 'trips', label: 'My Trips', icon: MapPin },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'currency', label: 'Currency', icon: ArrowRightLeft },
  { id: 'images', label: 'Image AI', icon: Image },
  { id: 'emergency', label: 'Emergency', icon: ShieldAlert },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'preferences', label: 'Preferences', icon: Heart },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, loading, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
  };

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-display font-semibold text-lg text-foreground tracking-tight">Atlas</span>
        <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded-full ml-auto">
          v2.0
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                {(user.name?.[0] || 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all"
          >
            <User className="w-4 h-4" />
            Sign in
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Compass className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">Atlas</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-accent transition-all"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 border-r border-border bg-background z-30 flex-col">
        {sidebarContent}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
