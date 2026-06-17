import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth
import Login          from './components/auth/Login.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

// Layout
import MainLayout from './layouts/MainLayout.jsx';

// Pages
import Dashboard       from './pages/Dashboard.jsx';
import Alerts          from './pages/Alerts.jsx';
import Categories      from './pages/Categories.jsx';
import CurrentStock    from './pages/CurrentStock.jsx';
import Products        from './pages/Products.jsx';
import Racks           from './pages/Racks.jsx';
import Reports         from './pages/Reports.jsx';
import StockIn, { PurchaseInvoicePage } from './pages/StockIn.jsx';
import StockInRejected from './pages/StockInRejected';
import StockOut        from './pages/StockOut.jsx';
import StockOutHistory from './pages/StockOutHistory.jsx';
import Suppliers       from './pages/Suppliers.jsx';
import SupplierDetail  from './pages/SupplierDetail.jsx';
import ExcelImport     from './pages/ExcelImport.jsx';
import DeliveryChallan from './pages/DeliveryChallan.jsx';

// Purchase Orders
import PurchaseOrderList   from './components/purchaseorders/PurchaseOrderList.jsx';
import PurchaseOrderCreate from './components/purchaseorders/PurchaseOrderCreate.jsx';
import PurchaseOrderDetail from './components/purchaseorders/PurchaseOrderDetail.jsx';

// Purchase Requests
import PurchaseRequestList   from './components/purchaserequests/PurchaseRequestList.jsx';
import PurchaseRequestCreate from './components/purchaserequests/PurchaseRequestCreate.jsx';
import PurchaseRequestDetail from './components/purchaserequests/PurchaseRequestDetail.jsx';

// QC Module
import QcQueue      from './pages/QcQueue.jsx';
import QcInspection from './pages/QcInspection.jsx';
import QcTemplates  from './pages/QcTemplates.jsx';
import QcDashboard  from './pages/QcDashboard.jsx';
import QcApproved   from './pages/QcApproved.jsx';
import QcRejected   from './pages/QcRejected.jsx';
import QcHistory    from './pages/QcHistory.jsx';
import QcAlerts     from './pages/QcAlerts.jsx';

// Return Challans — OWNER only
import ReturnChallanList   from './pages/ReturnChallanList.jsx';
import ReturnChallanDetail from './pages/ReturnChallanDetail.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"      element={<Login/>}/>
          <Route path="/login" element={<Login/>}/>

          {/* Protected — all roles enter here */}
          <Route element={<ProtectedRoute/>}>
            <Route element={<MainLayout/>}>

              {/* ── OWNER only pages ── */}
              <Route path="/dashboard"  element={<Dashboard/>}/>
              <Route path="/categories" element={<Categories/>}/>
              <Route path="/products"   element={<Products/>}/>
              <Route path="/racks"      element={<Racks/>}/>

              <Route path="/suppliers"     element={<Suppliers/>}/>
              <Route path="/suppliers/:id" element={<SupplierDetail/>}/>

              <Route path="/stock-in"          element={<StockIn/>}/>
              <Route path="/stock-in/rejected" element={<StockInRejected/>}/>
              <Route path="/stock-out"         element={<StockOut/>}/>
              <Route path="/stock-out/history" element={<StockOutHistory/>}/>
              <Route path="/current-stock"     element={<CurrentStock/>}/>
              <Route path="/delivery-challan"  element={<DeliveryChallan/>}/>

              {/* ── Invoices — standalone page (reuses PurchaseInvoicePage from StockIn) ── */}
              <Route path="/invoices" element={<PurchaseInvoicePage/>}/>

              <Route path="/alerts"       element={<Alerts/>}/>
              <Route path="/reports"      element={<Reports/>}/>
              <Route path="/excel-import" element={<ExcelImport/>}/>

              <Route path="/purchase-orders"     element={<PurchaseOrderList/>}/>
              <Route path="/purchase-orders/new" element={<PurchaseOrderCreate/>}/>
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail/>}/>

              <Route path="/purchase-requests"     element={<PurchaseRequestList/>}/>
              <Route path="/purchase-requests/new" element={<PurchaseRequestCreate/>}/>
              <Route path="/purchase-requests/:id" element={<PurchaseRequestDetail/>}/>

              {/* ── QC Module — both OWNER + QC ── */}
              <Route path="/qc/dashboard"   element={<QcDashboard/>}/>
              <Route path="/qc/queue"       element={<QcQueue/>}/>
              <Route path="/qc/batches/:id" element={<QcInspection/>}/>
              <Route path="/qc/approved"    element={<QcApproved/>}/>
              <Route path="/qc/rejected"    element={<QcRejected/>}/>
              <Route path="/qc/history"     element={<QcHistory/>}/>
              <Route path="/qc/alerts"      element={<QcAlerts/>}/>
              <Route path="/qc/templates"   element={<QcTemplates/>}/>

              {/* ── Return Challans — OWNER only ── */}
              <Route path="/qc/return-challans"     element={<ReturnChallanList/>}/>
              <Route path="/qc/return-challans/:id" element={<ReturnChallanDetail/>}/>

            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>

        <ToastContainer
          position="top-right" autoClose={3000}
          hideProgressBar={false} newestOnTop
          closeOnClick rtl={false}
          pauseOnFocusLoss draggable pauseOnHover
        />
      </AuthProvider>
    </Router>
  );
}

export default App;