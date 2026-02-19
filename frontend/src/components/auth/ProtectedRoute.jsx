import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  console.log('🔒 ProtectedRoute - User:', user);
  console.log('🔒 ProtectedRoute - Loading:', loading);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '24px'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    console.log('🔒 No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🔒 User authenticated, rendering Outlet');
  return <Outlet />;
};

export default ProtectedRoute;