import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RouteSkeleton from "./components/common/RouteSkeleton";

// PROTECTED ROUTES
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import ManagerProtectedRoute from "./components/manager/ManagerProtectedRoute";
import KitchenProtectedRoute from "./components/kitchen/KitchenProtectedRoute";

// LAZY-LOADED PAGES

// ADMIN
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Users = lazy(() => import("./pages/admin/Users"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const AdminMenu = lazy(() => import("./pages/admin/AdminMenu"));
const AdminTables = lazy(() => import("./pages/admin/AdminTables"));

// MANAGER
const ManagerLogin = lazy(() => import("./pages/manager/ManagerLogin"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerOrders = lazy(() => import("./pages/manager/ManagerOrders"));
const ManagerAssistedOrder = lazy(() => import("./pages/manager/ManagerAssistedOrder"));
const ManagerReports = lazy(() => import("./pages/manager/ManagerReports"));

// STAFF
const StaffLogin = lazy(() => import("./pages/staff/StaffLogin"));

// KITCHEN
const KitchenDashboard = lazy(() => import("./pages/kitchen/KitchenDashboard"));

// CUSTOMER
const TableLanding = lazy(() => import("./pages/customer/TableLanding"));
const Menu = lazy(() => import("./pages/customer/Menu"));
const CustomerOrders = lazy(() => import("./pages/customer/CustomerOrders"));

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteSkeleton />}>
        <Routes>
          {/* CUSTOMER */}
          <Route path="/" element={<TableLanding />} />
          <Route path="/customer/menu" element={<Menu />} />
          <Route path="/customer/orders" element={<CustomerOrders />} />

          {/* STAFF */}
          <Route
            path="/staff"
            element={<Navigate to="/staff/login" replace />}
          />
          <Route path="/staff/login" element={<StaffLogin />} />

          {/* MANAGER LOGIN */}
          <Route path="/manager/login" element={<ManagerLogin />} />

          {/* PROTECTED MANAGER */}
          <Route element={<ManagerProtectedRoute />}>
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/manager/orders" element={<ManagerOrders />} />
            <Route
              path="/manager/orders/new"
              element={<ManagerAssistedOrder />}
            />
            <Route path="/manager/reports" element={<ManagerReports />} />
          </Route>

          {/* KITCHEN */}
          <Route element={<KitchenProtectedRoute />}>
            <Route path="/kitchen" element={<KitchenDashboard />} />
          </Route>

          {/* ADMIN LOGIN */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* PROTECTED ADMIN */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="orders" element={<Orders />} />
              <Route path="categories" element={<Categories />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="tables" element={<AdminTables />} />
            </Route>
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
