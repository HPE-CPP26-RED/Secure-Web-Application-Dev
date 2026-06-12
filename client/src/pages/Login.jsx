import { useGoogleLogin } from "@react-oauth/google";
import { Button, HelperText, Input, Label } from "@windmill/react-ui";
import ForgotPasswordModal from "components/ForgotPasswordModal";
import { useUser } from "context/UserContext";
import Layout from "layout/Layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, Navigate, useLocation } from "react-router-dom";
import PulseLoader from "react-spinners/PulseLoader";
import authService from "services/auth.service";

const Login = () => {
  const { isLoggedIn, setUserState } = useUser();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [redirectToReferrer, setRedirectToReferrer] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [isMfaSubmitting, setIsMfaSubmitting] = useState(false);
  const { state } = useLocation();

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => handleGoogleLogin(codeResponse),
    onError: (error) => console.log("Login Failed:", error),
    flow: "auth-code",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleGoogleLogin(googleData) {
    try {
      const data = await authService.googleLogin(googleData.code);
      toast.success("Login successful 🔓");

      setUserState(data);
      setRedirectToReferrer(true);
      setIsGoogleLoading(false);
    } catch (error) {
      setIsGoogleLoading(false);
      toast.error("Could not login with Google 😢");
    }
  }

  const onSubmit = async (data) => {
    const { email, password } = data;

    try {
      setError("");
      setIsLoading(true);
      const data = await authService.login(email, password);

      if (data?.mfa_required) {
        setIsLoading(false);
        setMfaRequired(true);
        setMfaToken(data.mfa_token || "");
        setMfaError("");
        toast.success("MFA required. Enter your code to continue.");
        return;
      }

      toast.success("Login successful 🔓");

      setTimeout(() => {
        setUserState(data);
        setRedirectToReferrer(true);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      const res = error.response;
      if (res?.data?.errors && res.data.errors.length > 0) {
        setError(res.data.errors.map((err) => err.message).join(", "));
      } else {
        setError(res?.data?.message || "An error occurred");
      }
    }
  };

  const handleMfaLogin = async (event) => {
    event.preventDefault();
    if (!mfaToken || !mfaCode) {
      setMfaError("MFA code is required");
      return;
    }

    try {
      setMfaError("");
      setIsMfaSubmitting(true);
      const data = await authService.loginMfa(mfaToken, mfaCode);
      toast.success("Login successful 🔓");
      setUserState(data);
      setRedirectToReferrer(true);
    } catch (error) {
      const res = error.response;
      setMfaError(res?.data?.message || "Unable to verify MFA code");
    } finally {
      setIsMfaSubmitting(false);
    }
  };

  const resetMfaState = () => {
    setMfaRequired(false);
    setMfaToken("");
    setMfaCode("");
    setMfaError("");
  };

  if (redirectToReferrer) {
    return <Navigate to={state?.from || "/"} />;
  }
  if (isLoggedIn) {
    return <Navigate to={state?.from || "/"} />;
  }

  return (
    <Layout title="Login">
      <div className="relative min-h-[75vh] flex items-center justify-center m-auto py-10 px-4 overflow-hidden w-full">
        {/* Glow blobs for premium glassmorphism background */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse pointer-events-none [animation-delay:1.5s]"></div>

        <form
          className="relative bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md border border-white/30 dark:border-neutral-800/40 shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4 flex flex-col w-full md:w-1/2 max-w-lg z-10 transition-all duration-300 hover:shadow-emerald-500/5"
          onSubmit={mfaRequired ? handleMfaLogin : handleSubmit(onSubmit)}
        >
          <h1 className="text-center text-4xl font-extrabold my-4 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Continue Shopping
          </h1>
          {mfaRequired ? (
            <>
              <div className="mt-4">
                <Label className="block text-grey-darker text-sm font-bold mb-2">
                  <span>MFA Code</span>
                </Label>
                <Input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  placeholder="Enter the 6-digit code"
                />
              </div>
              {mfaError && (
                <HelperText className="mt-1 italic" valid={false}>
                  {mfaError}
                </HelperText>
              )}
              <Button type="submit" disabled={isMfaSubmitting}>
                {isMfaSubmitting ? (
                  <PulseLoader color={"#01A982"} size={10} loading />
                ) : (
                  "Verify and Continue"
                )}
              </Button>
              <Button layout="link" type="button" onClick={resetMfaState}>
                Back to login
              </Button>
            </>
          ) : (
            <>
              <div className="">
                <Label className="block text-grey-darker text-sm font-bold mb-2">
                  <span>Email</span>
                </Label>
                <Input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
                  type="email"
                  name="email"
                  {...register("email", {
                    required: true,
                    // eslint-disable-next-line no-useless-escape
                    pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
                  })}
                  placeholder="Enter a valid email"
                />
              </div>
              {errors?.email && errors?.email.type === "required" && (
                <HelperText className="mt-1 italic" valid={false}>
                  Email required
                </HelperText>
              )}
              {errors?.email && errors?.email.type === "pattern" && (
                <HelperText className="mt-1 italic" valid={false}>
                  Invalid email
                </HelperText>
              )}
              <div className="mt-4">
                <Label className="block text-grey-darker text-sm font-bold mb-2">
                  <span>Password</span>
                </Label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-grey-darker"
                  type="password"
                  name="password"
                  {...register("password", { required: true })}
                />
              </div>
              {errors?.password && (
                <HelperText className="mt-1 italic" valid={false}>
                  {errors?.password?.type === "required" && "Password required"}
                </HelperText>
              )}
              {error && (
                <HelperText className="mt-1 italic" valid={false}>
                  {error}
                </HelperText>
              )}
              <div className="mt-4 flex items-center justify-between">
                <ForgotPasswordModal />
              </div>
              <Button type="submit" disabled={isLoading || isGoogleLoading}>
                {isLoading ? <PulseLoader color={"#01A982"} size={10} loading /> : "Login"}
              </Button>
              <Button
                type="button"
                layout="link"
                onClick={() => {
                  setIsGoogleLoading(true);
                  login();
                }}
                disabled={isLoading || isGoogleLoading}
                className="mt-4 hover:bg-white bg-white shadow-md font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center mr-2 mb-2"
              >
                <svg
                  className="w-4 h-4 mr-2 -ml-1"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  ></path>
                </svg>
                {isGoogleLoading ? (
                  <PulseLoader color={"#01A982"} size={10} loading />
                ) : (
                  "Login in with Google"
                )}
              </Button>
              <p className="text-sm mt-4 text-slate-400">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="font-bold">
                  Sign Up
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </Layout>
  );
};

export default Login;
