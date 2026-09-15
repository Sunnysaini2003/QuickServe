import RouteSkeleton from "../common/RouteSkeleton";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "../../api/axios";

const KitchenProtectedRoute = () => {
  const [status, setStatus] = useState("checking");
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const verifyRole = async (requestedRole) => {
      try {
        const response = await api.get("/auth/me", {
          headers: { "X-QuickServe-Role": requestedRole.toLowerCase() },
        });

        const user = response.data?.data;

        if (!user || Number(user.is_active) !== 1 || user.role !== requestedRole) {
          return false;
        }

        localStorage.setItem(
          requestedRole === "Admin" ? "admin_user" : "staff_user",
          JSON.stringify(user),
        );

        if (mounted) {
          setRole(requestedRole);
          setStatus("authorized");
        }

        return true;
      } catch (error) {
        console.warn(`${requestedRole} kitchen authentication failed`, error);
        return false;
      }
    };

    const verifyUser = async () => {
      const storedKitchenRole = localStorage.getItem("kitchen_auth_role");
      const preferredRole =
        storedKitchenRole === "Admin" || storedKitchenRole === "Staff"
          ? storedKitchenRole
          : null;

      if (preferredRole) {
        if (await verifyRole(preferredRole)) return;
      }

      if (!preferredRole && localStorage.getItem("admin_user")) {
        if (await verifyRole("Admin")) return;
      }

      if (!preferredRole && localStorage.getItem("staff_user")) {
        if (await verifyRole("Staff")) return;
      }

      if (mounted) {
        setRole(null);
        setStatus("unauthorized");
      }
    };

    verifyUser();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") {
    return <RouteSkeleton />;
  }
  if (status === "unauthorized") {
    const kitchenRole = localStorage.getItem("kitchen_auth_role");
    return <Navigate to={kitchenRole === "Admin" ? "/admin" : "/staff/login"} replace />;
  }

  return <Outlet context={{ role }} />;
};

export default KitchenProtectedRoute;
