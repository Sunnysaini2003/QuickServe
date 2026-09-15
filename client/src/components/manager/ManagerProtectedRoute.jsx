import RouteSkeleton from "../common/RouteSkeleton";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api, { refreshAccessToken } from "../../api/axios";

const ManagerProtectedRoute = () => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;

    const verifyManager = async () => {
      try {
        let response;

        try {
          response = await api.get("/auth/me");
        } catch (error) {
          if (error?.response?.status !== 401) {
            throw error;
          }

          // Access token may have expired.
          await refreshAccessToken("manager");

          response = await api.get("/auth/me");
        }

        const user = response?.data?.data;

        if (
          !user ||
          Number(user.is_active) !== 1 ||
          user.role !== "Manager"
        ) {
          throw new Error("Invalid manager account");
        }

        localStorage.setItem(
          "manager_user",
          JSON.stringify(user),
        );

        if (mounted) {
          setStatus("authorized");
        }
      } catch (error) {
        console.error(
          "Manager authentication failed:",
          error,
        );

        localStorage.removeItem("manager_user");
        localStorage.removeItem("manager_token");

        if (mounted) {
          setStatus("unauthorized");
        }
      }
    };

    verifyManager();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") {
    return <RouteSkeleton />;
  }
  if (status === "unauthorized") {
    return (
      <Navigate
        to="/manager/login"
        replace
      />
    );
  }

  return <Outlet />;
};

export default ManagerProtectedRoute;