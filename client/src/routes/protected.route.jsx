import { useUser } from "context/UserContext";
import Layout from "layout/Layout";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ redirectPath = "/login", children }) => {
  const { isLoggedIn, authLoading } = useUser();
  const location = useLocation();

  // Session restoration (GET /users/profile) is still in flight — redirecting
  // now would bounce a validly-logged-in user before the cookie check completes.
  if (authLoading) {
    return <Layout loading />;
  }

  if (!isLoggedIn) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};
