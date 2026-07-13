import React from "react";
import { useUser } from "context/UserContext";
import Layout from "layout/Layout";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export const AdminRoute = ({ redirectPath = "/", children }) => {
  const { isLoggedIn, userData, authLoading } = useUser();
  const location = useLocation();

  // Same rationale as ProtectedRoute: don't decide RBAC access until the
  // getCurrentUser() session check has resolved, otherwise an admin gets
  // bounced off /admin on every reload before their role is known.
  if (authLoading) {
    return <Layout loading />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userData?.role !== "admin") {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};
