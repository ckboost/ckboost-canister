import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/landing';
import { LpDashboardPage } from './pages/lp-dashboard';
import { PendingBoostsPage } from './pages/pending-boosts';
import { useAuth } from './lib/auth-context';
import { ScrollToTop } from './components/scroll-to-top';
import { ScrollToTopButton } from './components/scroll-to-top-button';

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-400">Loading Authentication...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to /");
    return <Navigate to="/" replace />;
  }
  
  console.log("ProtectedRoute: Authenticated, rendering children");
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <LpDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/pending-boosts" element={
        <ProtectedRoute>
          <PendingBoostsPage /> 
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Router>
        <ScrollToTop />
        <AppRoutes />
        <ScrollToTopButton />
      </Router>
    </div>
  );
}

export default App;
