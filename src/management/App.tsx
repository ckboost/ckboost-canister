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
  
  // While checking authentication status, show nothing
  if (isLoading) return null;
  
  // If not authenticated, redirect to homepage
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  // If authenticated, render the children
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing page - Public */}
      <Route path="/" element={<LandingPage />} />

      {/* LP Dashboard - Protected (Uses correct component) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <LpDashboardPage /> 
        </ProtectedRoute>
      } />

      {/* Pending Boosts - Protected */}
      <Route path="/pending-boosts" element={
        <ProtectedRoute>
          <PendingBoostsPage />
        </ProtectedRoute>
      } />

      {/* Remove other unused routes from copied frontend */}
      
      {/* Redirect any other path to landing */}
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
