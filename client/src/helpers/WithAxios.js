import { useEffect } from "react";
import API from "api/axios.config";
import { useUser } from "context/UserContext";
import history from "helpers/history";

// The only caller of this endpoint is UserContext's silent session-restore
// check on app start. A 401 there just means "not logged in" — it must not
// force-navigate a guest browsing public pages to /login.
const AUTH_CHECK_URL = "/users/profile";

const WithAxios = ({ children }) => {
  const { setIsLoggedIn, setUserData } = useUser();

  // Registered once, unconditionally, for the lifetime of the app. It must
  // be active even before the user is known to be logged in, since it also
  // has to cover the initial getCurrentUser() bootstrap request — that's
  // exactly the request that needs a silent token refresh if the access
  // token (15 min) has expired but the refresh token (7 days) is still valid.
  useEffect(() => {
    const interceptorId = API.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (!error.response || !originalRequest) {
          return Promise.reject(error);
        }

        const isAuthCheck = originalRequest.url === AUTH_CHECK_URL;

        if (error.response.status === 401 && originalRequest.url === "/auth/refresh-token") {
          setIsLoggedIn(false);
          setUserData(null);
          if (!isAuthCheck) history.push("/login");
          return Promise.reject(error);
        }

        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await API.post("/auth/refresh-token");
            return API(originalRequest);
          } catch (refreshError) {
            setIsLoggedIn(false);
            setUserData(null);
            if (!isAuthCheck) history.push("/login");
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      API.interceptors.response.eject(interceptorId);
    };
  }, [setIsLoggedIn, setUserData]);

  return children;
};

export default WithAxios;
