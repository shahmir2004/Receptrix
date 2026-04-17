import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authedRequest, publicRequest, getErrorMessage, setUnauthorizedHandler } from './api';
import { useToast } from './toast-context';

interface User {
  user_id: string;
  email: string;
  full_name: string;
}

interface BusinessMembership {
  business_id: string;
  business_name: string;
  role: string;
}

interface AuthContextValue {
  currentUser: User | null;
  businessMemberships: BusinessMembership[];
  currentBusinessId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, businessName: string, email: string, password: string) => Promise<{ success: boolean; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  setBusinessContext: (businessId: string | null) => void;
  hasActiveBusinessContext: () => boolean;
  ensureActiveBusinessContext: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function chooseBusinessId(
  current: string | null,
  businesses: BusinessMembership[],
  payloadCurrent: string | null
): string | null {
  if (current && businesses.some((b) => b.business_id === current)) return current;
  if (payloadCurrent) return payloadCurrent;
  return businesses[0]?.business_id || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [businessMemberships, setBusinessMemberships] = useState<BusinessMembership[]>([]);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(
    localStorage.getItem('businessId')
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const setBusinessContext = useCallback((businessId: string | null) => {
    setCurrentBusinessIdState(businessId);
    if (businessId) localStorage.setItem('businessId', businessId);
    else localStorage.removeItem('businessId');
  }, []);

  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setBusinessMemberships([]);
    setBusinessContext(null);
  }, [setBusinessContext]);

  const applySessionContext = useCallback(
    (user: User | null, businesses: BusinessMembership[], payloadCurrentBusinessId: string | null) => {
      setCurrentUser(user);
      setBusinessMemberships(Array.isArray(businesses) ? businesses : []);
      setIsAuthenticated(Boolean(user?.user_id));
      const selectedId = chooseBusinessId(currentBusinessId, businesses, payloadCurrentBusinessId);
      setBusinessContext(selectedId);
    },
    [currentBusinessId, setBusinessContext]
  );

  const applyAuthPayload = useCallback(
    (payload: Record<string, unknown>) => {
      const user = (payload?.user as User) || null;
      const businesses = (payload?.businesses as BusinessMembership[]) || [];
      const selectedBusinessId = (payload?.current_business_id as string) || null;
      applySessionContext(user, businesses, selectedBusinessId);
    },
    [applySessionContext]
  );

  const applyMePayload = useCallback(
    (payload: Record<string, unknown>) => {
      const profile = (payload?.profile as Record<string, string>) || {};
      const user: User = {
        user_id: (payload?.user_id as string) || '',
        email: profile?.email || '',
        full_name: profile?.full_name || '',
      };
      const businesses = (payload?.businesses as BusinessMembership[]) || [];
      const selectedBusinessId = (payload?.current_business_id as string) || null;
      applySessionContext(user, businesses, selectedBusinessId);
    },
    [applySessionContext]
  );

  const hasActiveBusinessContext = useCallback(() => Boolean(currentBusinessId), [currentBusinessId]);

  const ensureActiveBusinessContext = useCallback(async (): Promise<boolean> => {
    if (currentBusinessId) return true;
    try {
      const meData = await authedRequest<Record<string, unknown>>('/auth/me', { method: 'GET' });
      if (meData.success) {
        applyMePayload(meData);
        return Boolean(localStorage.getItem('businessId'));
      }
    } catch (error) {
      console.warn('Unable to resolve business context from profile.', error);
    }
    return false;
  }, [currentBusinessId, applyMePayload]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const { response, data } = await publicRequest<Record<string, unknown>>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.ok && data.success) {
        applyAuthPayload(data);
        return true;
      }
      const detail = data?.detail as Record<string, unknown> | null;
      const code = detail?.code as string | undefined;
      if (code === 'EMAIL_NOT_VERIFIED') {
        throw new Error('EMAIL_NOT_VERIFIED');
      }
      throw new Error(getErrorMessage(data, 'Sign in failed'));
    },
    [applyAuthPayload]
  );

  const signup = useCallback(
    async (
      name: string,
      businessName: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; needsVerification?: boolean }> => {
      const { response, data } = await publicRequest<Record<string, unknown>>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: name, business_name: businessName }),
      });
      if (response.ok && data.success) {
        if (data.needs_email_verification) {
          clearAuth();
          return { success: true, needsVerification: true };
        }
        applyAuthPayload(data);
        return { success: true };
      }
      throw new Error(getErrorMessage(data, 'Sign up failed'));
    },
    [applyAuthPayload, clearAuth]
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch(`${window.location.origin}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      toast.show('You have been logged out.', 'info');
      navigate('/');
      setIsLoggingOut(false);
    }
  }, [clearAuth, navigate, toast]);

  const refreshSession = useCallback(async () => {
    try {
      const meData = await authedRequest<Record<string, unknown>>('/auth/me', { method: 'GET' });
      if (meData.success) {
        applyMePayload(meData);
      }
    } catch {
      // silent
    }
  }, [applyMePayload]);

  // Initialize session on mount
  useEffect(() => {
    async function init() {
      try {
        const response = await fetch(`${window.location.origin}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          applyMePayload(data);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [applyMePayload, clearAuth]);

  // Set up unauthorized handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth();
      toast.show('Session expired. Please sign in again.', 'info');
      navigate('/signin');
    });
  }, [clearAuth, navigate, toast]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        businessMemberships,
        currentBusinessId,
        isAuthenticated,
        isLoading,
        isLoggingOut,
        login,
        signup,
        logout,
        setBusinessContext,
        hasActiveBusinessContext,
        ensureActiveBusinessContext,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
