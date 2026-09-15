import RouteSkeleton from "../common/RouteSkeleton";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "../../api/axios";

const StaffProtectedRoute = () => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;

    const verifyStaff = async () => {
      try {
        const response = await api.get("/auth/me");
        const user = response.data?.data;

        if (!user || Number(user.is_active) !== 1 || user.role !== "Staff") {
          throw new Error("Invalid staff account");
        }

        localStorage.setItem("staff_user", JSON.stringify(user));

        if (mounted) setStatus("authorized");
      } catch (error) {
        console.error("Staff authentication failed:", error);
        localStorage.removeItem("staff_user");
        localStorage.removeItem("staff_token");
        if (mounted) setStatus("unauthorized");
      }
    };

    verifyStaff();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") {
    return <RouteSkeleton />;
  }
  if (status === "unauthorized") {
    return <Navigate to="/staff/login" replace />;
  }

  return <Outlet />;
};

export default StaffProtectedRoute;
