import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// In App.js or Routes.js
import StockOutHistory from './pages/StockOutHistory';

// Auth components
import Login from './components/auth/Login.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

// Layout
import MainLayout from './layouts/MainLayout.jsx';

// Pages
import Dashboard from './pages/Dashboard.jsx';
import Alerts from './pages/Alerts.jsx';
import Categories from './pages/Categories.jsx';
import CurrentStock from './pages/CurrentStock.jsx';
import Products from './pages/Products.jsx';
import Racks from './pages/Racks.jsx';
import Reports from './pages/Reports.jsx';
import StockIn from './pages/StockIn.jsx';
import StockOut from './pages/StockOut.jsx';
import Suppliers from './pages/Suppliers.jsx';
import ExcelImport from './pages/ExcelImport.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/products" element={<Products />} />
              <Route path="/racks" element={<Racks />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/stock-in" element={<StockIn />} />
              <Route path="/stock-out" element={<StockOut />} />
              <Route path="/current-stock" element={<CurrentStock />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reports" element={<Reports />} />
			  <Route path="/stock-out-history" element={<StockOutHistory />} />
			  <Route path="/excel-import" element={<ExcelImport />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AuthProvider>
  );
}

export default App;