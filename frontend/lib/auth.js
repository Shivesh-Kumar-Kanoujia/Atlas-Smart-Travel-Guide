import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logoutUser } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("atlas_user");
    const token = localStorage.getItem("atlas_token");
    if (saved && token) {
      setUser(JSON.parse(saved));
      // Verify token is still valid
      getMe()
        .then(r => {
          setUser(r.data);
          localStorage.setItem("atlas_user", JSON.stringify(r.data));
          if (r.data.travel_memory) {
            localStorage.setItem("atlas_memory", r.data.travel_memory);
          }
        })
        .catch(() => { clearAuth(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const saveAuth = (token, userData) => {
    localStorage.setItem("atlas_token", token);
    localStorage.setItem("atlas_user", JSON.stringify(userData));
    setUser(userData);
  };

  const clearAuth = () => {
    localStorage.removeItem("atlas_token");
    localStorage.removeItem("atlas_user");
    localStorage.removeItem("atlas_memory");
    setUser(null);
  };

  const logout = async () => {
    try { await logoutUser(); } catch {}
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, saveAuth, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
