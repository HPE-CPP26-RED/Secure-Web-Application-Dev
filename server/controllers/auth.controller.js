/**
 * auth.controller.js
 * Handles HTTP layer for authentication routes.
 *
 * Security controls:
 * - Access token delivered as HttpOnly, Secure, SameSite=Strict cookie
 * - Refresh token delivered as HttpOnly, Secure, SameSite=Strict cookie
 *   scoped to /api/auth/refresh-token
 * - No tokens exposed in response headers or JSON body
 * - Full audit logging for every auth event
 */
const authService = require("../services/auth.service");
const mail = require("../services/mail.service");
const { revokeRefreshTokenDb } = require("../db/refreshToken.db");
const { ErrorHandler } = require("../helpers/error");
const { logger } = require("../utils/logger");

// ── Cookie configuration ────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";

/** HttpOnly, Secure, SameSite=Strict access token cookie (15 min) */
const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,          // HTTPS only in production
  sameSite: "Strict",
  maxAge: 15 * 60 * 1000,        // 15 minutes in ms
  path: "/",
};

/** HttpOnly, Secure, SameSite=Strict refresh token cookie (7 days) */
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "Strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/api/auth/refresh-token",  // Scoped — only sent on refresh endpoint
};

/** Clear cookie options (expire immediately) */
const clearAccessCookie = { ...accessCookieOptions, maxAge: 0 };
const clearRefreshCookie = { ...refreshCookieOptions, maxAge: 0 };

// ── Helpers ─────────────────────────────────────────────────────────────────

const setAuthCookies = (res, token, refreshToken) => {
  res.cookie("accessToken", token, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

// ── Controllers ──────────────────────────────────────────────────────────────

const createAccount = async (req, res) => {
  const { token, refreshToken, user } = await authService.signUp(req.body);

  if (process.env.NODE_ENV !== "test") {
    await mail.signupMail(user.email, user.fullname.split(" ")[0]);
  }

  setAuthCookies(res, token, refreshToken);

  logger.info({ event: "SIGNUP_SUCCESS", userId: user.user_id, ip: req.ip });

  res.status(201).json({ status: "success", user });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const authResponse = await authService.login(email, password);

  if (authResponse.mfaRequired) {
    logger.info({ event: "LOGIN_MFA_REQUIRED", userId: authResponse.user.user_id, ip: req.ip });
    return res.status(200).json({
      status: "mfa_required",
      mfa_required: true,
      mfa_token: authResponse.mfaToken,
      user: authResponse.user,
    });
  }

  setAuthCookies(res, authResponse.token, authResponse.refreshToken);

  logger.info({ event: "LOGIN_SUCCESS", userId: authResponse.user.user_id, ip: req.ip });

  res.status(200).json({ status: "success", user: authResponse.user });
};

const googleLogin = async (req, res) => {
  try {
    const { code } = req.body;
    const { token, refreshToken, user } = await authService.googleLogin(code);

    setAuthCookies(res, token, refreshToken);

    logger.info({ event: "GOOGLE_LOGIN_SUCCESS", userId: user.user_id, ip: req.ip });

    res.json({ status: "success", user });
  } catch (error) {
    logger.error({
      event: "GOOGLE_LOGIN_ERROR",
      message: error.message,
      stack: error.stack,
      body: {
        code: req.body?.code ? "*** REDACTED_CODE ***" : undefined
      }
    });
    
    console.error("Google Auth Error:", error.message);
    console.error("Stack Trace:", error.stack);

    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const logoutUser = async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (rawRefreshToken) {
    try {
      await revokeRefreshTokenDb(rawRefreshToken);
    } catch (err) {
      // Log but don't fail logout — still clear cookies
      logger.warn({ event: "LOGOUT_REVOKE_ERROR", err: err.message });
    }
  }

  res.clearCookie("accessToken", clearAccessCookie);
  res.clearCookie("refreshToken", clearRefreshCookie);

  logger.info({ event: "LOGOUT_SUCCESS", userId: req.user?.id ?? "anonymous", ip: req.ip });

  res.json({ status: "success", message: "Logged out successfully" });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // Always respond with 200 to avoid email enumeration
    await authService.forgotPassword(email);
    res.json({ status: "OK" });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const verifyResetToken = async (req, res) => {
  const { token, email } = req.body;
  const isTokenValid = await authService.verifyResetToken(token, email);

  if (!isTokenValid) {
    return res.json({
      message: "Token has expired. Please try password reset again.",
      showForm: false,
    });
  }
  res.json({ showForm: true });
};

const refreshToken = async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (!rawRefreshToken) {
    logger.warn({ event: "REFRESH_FAILURE", reason: "No refresh cookie", ip: req.ip });
    throw new ErrorHandler(401, "Refresh token missing");
  }

  const tokens = await authService.generateRefreshToken(rawRefreshToken);

  setAuthCookies(res, tokens.token, tokens.refreshToken);

  logger.info({ event: "REFRESH_SUCCESS", ip: req.ip });

  res.json({ status: "success", message: "Tokens refreshed" });
};

const resetPassword = async (req, res) => {
  try {
    const { password, password2, token, email } = req.body;
    await authService.resetPassword(password, password2, token, email);
    res.json({
      status: "OK",
      message: "Password reset. Please log in with your new password.",
    });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const setupMfa = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { qrCodeDataUrl, otpauthUrl } = await authService.initMfaSetup(email, password);
    res.status(200).json({ status: "success", qrCodeDataUrl, otpauthUrl });
  } catch (error) {
    logger.error({ event: "MFA_SETUP_ERROR", message: error.message, stack: error.stack });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};

const verifyMfa = async (req, res) => {
  try {
    const { email, password, code } = req.body;
    await authService.verifyMfaSetup(email, password, code);
    res.status(200).json({ status: "success", message: "MFA enabled" });
  } catch (error) {
    logger.error({ event: "MFA_VERIFY_ERROR", message: error.message, stack: error.stack });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};

const loginMfa = async (req, res) => {
  try {
    const { mfa_token, code } = req.body;
    const { token, refreshToken, user } = await authService.loginMfa(mfa_token, code);

    setAuthCookies(res, token, refreshToken);

    logger.info({ event: "LOGIN_MFA_SUCCESS", userId: user.user_id, ip: req.ip });

    res.status(200).json({ status: "success", user });
  } catch (error) {
    logger.error({ event: "LOGIN_MFA_ERROR", message: error.message, stack: error.stack });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};

module.exports = {
  createAccount,
  loginUser,
  googleLogin,
  logoutUser,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  refreshToken,
  setupMfa,
  verifyMfa,
  loginMfa,
};
