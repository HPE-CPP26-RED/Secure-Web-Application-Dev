import { Button, HelperText, Input, Label } from "@windmill/react-ui";
import Layout from "layout/Layout";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import PulseLoader from "react-spinners/PulseLoader";
import authService from "services/auth.service";

const ResetPassword = () => {
  const [msg, setMsg] = useState(null);
  const [resetMsg, setResetMsg] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();
  const password = useRef({});
  password.current = watch("password", "");

  useEffect(() => {
    const hasToken = typeof token === "string" && token.trim().length > 0;
    const hasEmail = typeof email === "string" && email.trim().length > 0;

    if (!hasToken || !hasEmail) {
      setMsg({
        showForm: false,
        message: "Reset link is missing required information. Please request a new one.",
      });
      setIsChecking(false);
      return;
    }

    authService
      .checkToken(token, email)
      .then(({ data }) => setMsg(data))
      .catch((e) => {
        setMsg({
          showForm: false,
          message: e?.response?.data?.message || "Token validation failed.",
        });
      })
      .finally(() => setIsChecking(false));
  }, [token, email]);

  const handlePasswordReset = (data) => {
    const hasToken = typeof token === "string" && token.trim().length > 0;
    const hasEmail = typeof email === "string" && email.trim().length > 0;
    if (!hasToken || !hasEmail) {
      setResetMsg("Reset link is missing required information. Please request a new one.");
      return;
    }

    setIsResetting(true);
    authService
      .resetPassword(token, email, data.password, data.password2)
      .then(({ data }) => {
        if (data.status === "error") {
          setIsResetting(false);
          setResetMsg(data.message || "Password reset failed.");
          return;
        }
        toast.success(data.message);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      })
      .catch((err) => {
        setIsResetting(false);
        setResetMsg(err?.response?.data?.message || "Password reset failed.");
      });
  };
  return (
    <Layout title="Reset Password">
      {isChecking ? (
        <div className="pt-12">
          <div className="mx-auto max-w-lg shadow-2xl p-8 md:p-10 text-center">
            <p>Validating reset link...</p>
          </div>
        </div>
      ) : msg?.showForm ? (
        <div className="pt-12">
          <header className="max-w-lg mx-auto mb-4">
            <h1 className="text-4xl font-bold text-center">Reset Password</h1>
          </header>
          <div className="mx-auto max-w-lg shadow-2xl p-8 md:p-10">
            <form className="flex flex-col" onSubmit={handleSubmit(handlePasswordReset)}>
              <Label className="mb-4">
                <span className="block text-gray-700 text-sm font-bold mb-2">Password</span>
                <Input
                  className="rounded w-full text-gray-700 focus:outline-none border px-2 py-2 focus:border-purple-600 transition duration-500"
                  type="password"
                  inputMode="password"
                  name="password"
                  {...register("password", {
                    required: "Password cannot be empty",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                    pattern: {
                      value:
                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/,
                      message:
                        "Password must include uppercase, lowercase, number, and special character",
                    },
                  })}
                />
                {resetMsg && (
                  <HelperText className="pt-2" valid={false}>
                    {resetMsg}
                  </HelperText>
                )}
              </Label>
              <Label className="mb-4">
                <span className="block text-gray-700 text-sm font-bold mb-2">Confirm Password</span>
                <Input
                  className="rounded w-full text-gray-700 focus:outline-none border px-2 py-2 focus:border-purple-600 transition duration-500"
                  type="password"
                  inputMode="password"
                  name="password2"
                  {...register("password2", {
                    validate: (value) => value === password.current || "Passwords do not match",
                  })}
                />
              </Label>
              {errors.password && (
                <HelperText className="pt-2" valid={false}>
                  {errors.password.message}
                </HelperText>
              )}
              {errors.password2 && (
                <HelperText className="pt-2" valid={false}>
                  {errors.password2.message}
                </HelperText>
              )}
              {resetMsg && (
                <HelperText className="pt-2" valid={false}>
                  {resetMsg}
                </HelperText>
              )}
              <Button type="submit" disabled={isResetting}>
                {isResetting ? <PulseLoader size={10} color={"#01A982"} /> : "Reset Password"}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="pt-12">
          <div className="mx-auto max-w-lg shadow-2xl p-8 md:p-10 text-center">
            <p>{msg?.message || "Reset link is invalid or expired."}</p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ResetPassword;
