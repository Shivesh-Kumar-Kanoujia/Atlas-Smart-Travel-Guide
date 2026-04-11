import { useState } from "react";
import { Menu, X, Compass, LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "../lib/auth";
import AuthModal from "./AuthModal";
import toast from "react-hot-toast";

const NAV_TABS = [
  { id: "chat",      label: "AI Guide"   },
  { id: "trips",     label: "My Trips"   },
  { id: "weather",   label: "Weather"    },
  { id: "currency",  label: "Currency"   },
  { id: "images",    label: "Image AI"   },
  { id: "emergency", label: "Emergency"  },
];

export default function Navbar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [showAuth, setShowAuth]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    toast.success("Signed out");
  };

  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-sand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-sand-500 rounded-lg flex items-center justify-center">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-semibold text-lg text-sand-900 tracking-tight">Atlas</span>
              <span className="hidden sm:inline text-xs text-sand-400 font-mono bg-sand-100 px-2 py-0.5 rounded-full ml-1">
                v2.0
              </span>
            </div>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_TABS.map(tab => (
                <button key={tab.id} onClick={() => onTabChange(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-sand-500 text-white shadow-sm"
                      : "text-sand-700 hover:bg-sand-100 hover:text-sand-900"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Auth area */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-sand-100 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-sand-500 flex items-center justify-center text-white text-xs font-semibold">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-sand-700 max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-sand-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-sand-200 rounded-xl shadow-lg overflow-hidden z-50">
                      <div className="px-3 py-2.5 border-b border-sand-100">
                        <div className="text-xs font-medium text-sand-700 truncate">{user.name}</div>
                        <div className="text-xs text-sand-400 truncate">{user.email}</div>
                      </div>
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all">
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-sand-500 text-white rounded-lg text-sm font-medium hover:bg-sand-600 transition-all">
                  <User className="w-3.5 h-3.5" /> Sign in
                </button>
              )}

              {/* Mobile menu button */}
              <button className="md:hidden p-2 rounded-lg text-sand-600 hover:bg-sand-100"
                onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-sand-200 bg-white/95 px-4 py-3 grid grid-cols-3 gap-2">
            {NAV_TABS.map(tab => (
              <button key={tab.id} onClick={() => { onTabChange(tab.id); setMobileOpen(false); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? "bg-sand-500 text-white" : "text-sand-700 bg-sand-50 hover:bg-sand-100"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
