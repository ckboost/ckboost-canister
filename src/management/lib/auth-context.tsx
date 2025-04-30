import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth as useNfidAuth } from '@nfid/identitykit/react';
import { useNavigate } from 'react-router-dom';


interface User {
  principal: string;
  subAccount?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => void;
  identity: any | null;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  refreshAuth: () => {},
  identity: null,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    refreshAuth: () => {},
    identity: null,
  });

  // Use the NFID auth hook
  const nfidAuth = useNfidAuth();
  
  const refreshAuth = () => {
    console.log("Manually refreshing auth state");
    if (!nfidAuth.user || nfidAuth.user.principal.toString() === "2vxsx-fae") {
      console.log("No valid user during refresh, clearing principal in wallet service");
    } else {
      const principalStr = nfidAuth.user.principal.toString();
      console.log("Refreshing principal in wallet service:", principalStr);
    }
    
    updateAuthState();
  };
  
  const updateAuthState = useCallback(() => {
    const isLoading = nfidAuth.isConnecting;
    
    console.log("Auth state update - isConnecting:", isLoading);
    console.log("Auth state update - nfidAuth.user:", nfidAuth.user);
    
    if (!isLoading) {
      if (nfidAuth.user) {
        const principalStr = nfidAuth.user.principal.toString();
        console.log("Auth principal string:", principalStr);
        
        if (principalStr === "2vxsx-fae") {
          console.warn("Anonymous principal detected. User is not properly authenticated.");
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            refreshAuth,
            identity: null,
          });
          return;
        }
        
        const user: User = {
          principal: principalStr,
          subAccount: nfidAuth.user.subAccount,
        };

        console.log('User authenticated:', user);
        console.log("Principal set in wallet service:", user.principal);

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          refreshAuth,
          identity: (nfidAuth as any)?.identity,
        });
      } else {
        console.log("No user found in nfidAuth");
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          refreshAuth,
          identity: null,
        });
      }
    } else {
      setAuthState(prev => ({
        ...prev,
        isLoading: true,
        refreshAuth,
      }));
    }

    // --- Log the nfidAuth object --- 
    console.log("AuthProvider - nfidAuth object:", nfidAuth);
    // --- End Log ---

  }, [nfidAuth.isConnecting, nfidAuth.user]);

  useEffect(() => {
    console.log("Auth context effect triggered");
    updateAuthState();
  }, [updateAuthState]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
      console.log("withAuth effect - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "user:", user);
      if (!isLoading && !isAuthenticated) {
        console.log("withAuth - redirecting to homepage due to no authentication");
        // Redirect to homepage if not authenticated
        navigate('/');
      }
    }, [isAuthenticated, isLoading, navigate, user]);

    if (isLoading) {
      // Loading component
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    // Only render component if authenticated
    return isAuthenticated ? <Component {...props} /> : null;
  };
} 