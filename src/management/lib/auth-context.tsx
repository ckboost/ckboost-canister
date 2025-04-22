import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth as useNfidAuth } from '@nfid/identitykit/react';

interface User {
  principal: string;
  subAccount?: any; // Define more strictly if possible
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  refreshAuth: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const nfidAuth = useNfidAuth();

  const [userState, setUserState] = useState<User | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);

  const updateAuthState = useCallback(() => {
    const isLoading = nfidAuth.isConnecting;
    let isAuthed = false;
    let user : User | null = null;

    if (!isLoading && nfidAuth.user) {
      const principalStr = nfidAuth.user.principal.toText();
      if (principalStr !== "2vxsx-fae") { 
        isAuthed = true;
        user = {
          principal: principalStr,
          subAccount: nfidAuth.user.subAccount,
        };
      } else {
        console.warn("Anonymous principal detected.");
      }
    }

    setIsLoadingState(isLoading);
    setIsAuthenticatedState(isAuthed);
    setUserState(user);

  }, [nfidAuth.isConnecting, nfidAuth.user]); 

  useEffect(() => {
    updateAuthState();
  }, [updateAuthState]);

  const refreshAuth = useCallback(() => {
    console.log("refreshAuth called");
    updateAuthState(); 
  }, [updateAuthState]);

  const contextValue: AuthContextType = {
    user: userState,
    isAuthenticated: isAuthenticatedState,
    isLoading: isLoadingState, 
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context as AuthContextType;
};

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    React.useEffect(() => {
      console.log("withAuth effect - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "user:", user);
      if (!isLoading && !isAuthenticated) {
        console.log("withAuth - redirecting to homepage due to no authentication");
      }
    }, [isAuthenticated, isLoading, user]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
} 