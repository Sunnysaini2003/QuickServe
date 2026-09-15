import RouteSkeleton from "../common/RouteSkeleton";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "../../api/axios";

const AdminProtectedRoute = () => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async () => {
      try {
        const response = await api.get("/auth/me");
        const user = response.data?.data;

        if (!user || Number(user.is_active) !== 1 || user.role !== "Admin") {
          throw new Error("Invalid admin account");
        }

        localStorage.setItem("admin_user", JSON.stringify(user));

        if (mounted) setStatus("authorized");
      } catch (error) {
        console.error("Admin authentication failed:", error);
        localStorage.removeItem("admin_user");
        localStorage.removeItem("admin_token");
        if (mounted) setStatus("unauthorized");
      }
    };

    verifyAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") {
    return <RouteSkeleton />;
  }
  if (status === "unauthorized") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
