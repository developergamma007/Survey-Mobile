import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  clearCachedProfile,
  loadCachedProfile,
  restoreSurveyorProfile,
  type SurveyorProfile,
} from '../helpers/surveyorSession';
import { isResponsesAdmin } from '../helpers/adminUsers';

type AdminAuthContextValue = {
  isAdminAuthenticated: boolean;
  isSurveyorLoggedIn: boolean;
  isAuthLoading: boolean;
  profile: SurveyorProfile | null;
  refreshAdminAuth: () => Promise<void>;
  clearAuth: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue>({
  isAdminAuthenticated: false,
  isSurveyorLoggedIn: false,
  isAuthLoading: true,
  profile: null,
  refreshAdminAuth: async () => {},
  clearAuth: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<SurveyorProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshAdminAuth = useCallback(async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      setProfile(null);
      setIsAuthLoading(false);
      return;
    }

    const restored = await restoreSurveyorProfile(token);
    if (restored) {
      setProfile(restored);
      setIsAuthLoading(false);
      return;
    }

    const cached = await loadCachedProfile();
    setProfile(cached);
    setIsAuthLoading(false);
  }, []);

  const clearAuth = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    await clearCachedProfile();
    setProfile(null);
  }, []);

  useEffect(() => {
    refreshAdminAuth();
  }, [refreshAdminAuth]);

  const isAdminAuthenticated = isResponsesAdmin(profile?.username);
  const isSurveyorLoggedIn = !!profile && !isAdminAuthenticated;

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminAuthenticated,
        isSurveyorLoggedIn,
        isAuthLoading,
        profile,
        refreshAdminAuth,
        clearAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
