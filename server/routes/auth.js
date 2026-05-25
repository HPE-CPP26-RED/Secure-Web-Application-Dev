const router = require("express").Router();
const {
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
} = require("../controllers/auth.controller");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  checkTokenSchema,
  resetPasswordSchema,
  googleLoginSchema,
  mfaSetupSchema,
  mfaVerifySchema,
  mfaLoginSchema,
} = require("../validators/auth.validators");

// Apply strict rate limiter to login and signup
router.post("/signup", authLimiter, validate(signupSchema), createAccount);
router.post("/login", authLimiter, validate(loginSchema), loginUser);

router.post("/google", validate(googleLoginSchema), googleLogin);
router.post("/logout", logoutUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/check-token", validate(checkTokenSchema), verifyResetToken);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/mfa/setup", authLimiter, validate(mfaSetupSchema), setupMfa);
router.post("/mfa/verify", authLimiter, validate(mfaVerifySchema), verifyMfa);
router.post("/login/mfa", authLimiter, validate(mfaLoginSchema), loginMfa);

module.exports = router;
