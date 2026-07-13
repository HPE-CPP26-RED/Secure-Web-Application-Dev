import API from "api/axios.config";
import WithAxios from "helpers/WithAxios";
import { createContext, useContext, useEffect, useState } from "react";
import authService from "services/auth.service";

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // True until the initial getCurrentUser() check resolves. ProtectedRoute
  // must not redirect while this is true, otherwise a valid session gets
  // treated as logged-out on every full page reload.
  const [authLoading, setAuthLoading] = useState(true);

  // The JWT lives in a Secure HttpOnly cookie, which JS cannot read. The only
  // way to know if a session is still valid after a reload is to ask the
  // backend, so every app start calls GET /users/profile once. The browser
  // attaches the accessToken cookie automatically (withCredentials: true).
  useEffect(() => {
    let isMounted = true;

    authService
      .getCurrentUser()
      .then((res) => {
        if (!isMounted) return;
        setUserData(res?.data ?? null);
        setIsLoggedIn(true);
      })
      .catch(() => {
        // 401/403/expired/invalid token, or the check couldn't complete —
        // fail closed and treat the visitor as logged out.
        if (!isMounted) return;
        setUserData(null);
        setIsLoggedIn(false);
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUserData = async ({ fullname, email, username, address, city, state, country }) => {
    const res = await API.put(`/users/${userData.user_id}`, {
      fullname,
      email,
      username,
      address,
      city,
      state,
      country,
    });
    setUserData(res.data);
  };

  const setUserInfo = (data) => {
    const { user } = data;
    setIsLoggedIn(true);
    setUserData(user);
  };

  const logout = async () => {
    setUserData(null);
    setIsLoggedIn(false);
    try {
      // Tells the backend to revoke the refresh token and clear both
      // HttpOnly cookies. Without this call the cookies remain valid and
      // getCurrentUser() would silently log the user back in on next reload.
      await authService.logout();
    } catch {
      // Best-effort: local state is already cleared, so the UI is correct
      // either way even if the network call fails.
    }
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        setUserState: (data) => setUserInfo(data),
        logout,
        isLoggedIn,
        setIsLoggedIn,
        authLoading,
        updateUserData,
      }}
    >
      <WithAxios>{children}</WithAxios>
    </UserContext.Provider>
  );
};

const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};

export { UserProvider, useUser };
