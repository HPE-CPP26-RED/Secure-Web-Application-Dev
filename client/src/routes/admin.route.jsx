import React from "react";
import { useUser } from "context/UserContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export const AdminRoute = ({ redirectPath = "/", children }) => {
  const { isLoggedIn, userData } = useUser();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userData?.role !== "admin") {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};
