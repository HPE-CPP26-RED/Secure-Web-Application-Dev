/**
 * auth.service.js
 * Handles all authentication business logic.
 *
 * Security controls:
 * - RS256 algorithm for all JWT signing (access + refresh)
 * - Access token: 15-minute expiry
 * - Refresh token: 7-day expiry, stored as SHA-256 hash in DB for rotation
 * - bcrypt cost factor 12 for all password operations
 * - Structured audit logging for all auth events
 */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const {
  setTokenStatusDb,
  createResetTokenDb,
  deleteResetTokenDb,
  isValidTokenDb,
} = require("../db/auth.db");
const {
  storeRefreshTokenDb,
  revokeRefreshTokenDb,
  isValidRefreshTokenDb,
} = require("../db/refreshToken.db");
const { ErrorHandler } = require("../helpers/error");
const { hashPassword } = require("../helpers/hashPassword");
const { changeUserPasswordDb } = require("../db/user.db");
const {
  getUserByEmailDb,
  getUserByUsernameDb,
  createUserDb,
  createUserGoogleDb,
  getUserByIdDb,
  setUserMfaSecretDb,
  enableUserMfaDb,
} = require("../db/user.db");
const { createCartDb } = require("../db/cart.db");
const mail = require("./mail.service");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const moment = require("moment");
const { logger } = require("../utils/logger");
const { getPrivateKey, getPublicKey } = require("../utils/keyManager");
const { encryptMfaSecret, decryptMfaSecret } = require("../utils/mfaCrypto");

// ── Shared helpers ──────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

/**
 * Validate email format and minimum password length (Joi handles full complexity,
 * this is a service-layer sanity guard).
 */
const isBasicInputValid = (email, password) => {
  const validEmail = typeof email === "string" && /\S+@\S+\.\S+/.test(email.trim());
  const validPassword = typeof password === "string" && password.trim().length >= 8;
  return validEmail && validPassword;
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// ── AuthService ─────────────────────────────────────────────────────────────

class AuthService {
  // ── Sign-up ──────────────────────────────────────────────────────────────

  async signUp(user) {
    const { password, email, fullname, username } = user;

    if (!email || !password || !fullname || !username) {
      logger.warn({ event: "SIGNUP_FAILURE", reason: "Missing required fields", email });
      throw new ErrorHandler(400, "All fields are required");
    }

    if (!isBasicInputValid(email, password)) {
      logger.warn({ event: "SIGNUP_FAILURE", reason: "Invalid email or password format", email });
      throw new ErrorHandler(400, "Invalid email or password format");
    }

    const userByEmail = await getUserByEmailDb(email);
    if (userByEmail) {
      logger.warn({ event: "SIGNUP_FAILURE", reason: "Email already taken", email });
      throw new ErrorHandler(409, "Email is already registered");
    }

    const userByUsername = await getUserByUsernameDb(username);
    if (userByUsername) {
      logger.warn({ event: "SIGNUP_FAILURE", reason: "Username already taken", username });
      throw new ErrorHandler(409, "Username is already taken");
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUserDb({ ...user, password: hashedPassword });
    const { id: cart_id } = await createCartDb(newUser.user_id);

    const tokenPayload = { id: newUser.user_id, role: newUser.role, cart_id };
    const token = this.signAccessToken(tokenPayload);
    const { rawToken: refreshToken, expiresAt } = this.signRefreshTokenRaw(tokenPayload);

    await storeRefreshTokenDb({
      userId: newUser.user_id,
      rawToken: refreshToken,
      expiresAt,
    });

    logger.info({ event: "SIGNUP_SUCCESS", userId: newUser.user_id, email: newUser.email });

    return {
      token,
      refreshToken,
      user: {
        user_id: newUser.user_id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(email, password) {
    if (!isBasicInputValid(email, password)) {
      logger.warn({ event: "LOGIN_FAILURE", reason: "Invalid input format", email });
      throw new ErrorHandler(401, "Invalid credentials");
    }

    const user = await getUserByEmailDb(email);
    if (!user) {
      // Constant-time guard: hash anyway to prevent timing attacks
      await bcrypt.hash(password, BCRYPT_ROUNDS);
      logger.warn({ event: "LOGIN_FAILURE", reason: "Email not found", email });
      throw new ErrorHandler(401, "Email or password incorrect");
    }

    if (user.google_id && !user.password) {
      logger.warn({ event: "LOGIN_FAILURE", reason: "Google-only account", email });
      throw new ErrorHandler(403, "Please log in with Google");
    }

    const { password: dbPassword, user_id, role, cart_id, fullname, username } = user;
    const isCorrectPassword = await bcrypt.compare(password, dbPassword);

    if (!isCorrectPassword) {
      logger.warn({ event: "LOGIN_FAILURE", reason: "Wrong password", userId: user_id });
      throw new ErrorHandler(401, "Email or password incorrect");
    }

    if (user.is_mfa_enabled) {
      if (!user.mfa_secret_enc || !user.mfa_secret_iv || !user.mfa_secret_tag) {
        logger.error({ event: "MFA_SECRET_MISSING", userId: user_id });
        throw new ErrorHandler(500, "MFA is enabled but not configured");
      }

      const mfaToken = this.signMfaToken({ id: user_id, email: user.email });
      logger.info({ event: "LOGIN_MFA_REQUIRED", userId: user_id });

      return {
        mfaRequired: true,
        mfaToken,
        user: { user_id, fullname, username, role },
      };
    }

    const tokenPayload = { id: user_id, role, cart_id };
    const token = this.signAccessToken(tokenPayload);
    const { rawToken: refreshToken, expiresAt } = this.signRefreshTokenRaw(tokenPayload);

    await storeRefreshTokenDb({ userId: user_id, rawToken: refreshToken, expiresAt });

    logger.info({ event: "LOGIN_SUCCESS", userId: user_id });

    return {
      token,
      refreshToken,
      user: { user_id, fullname, username, role },
    };
  }

  // ── Google Login ──────────────────────────────────────────────────────────

  async googleLogin(code) {
    const ticket = await this.verifyGoogleIdToken(code);
    const { name, email, sub } = ticket.getPayload();
    const defaultUsername = name.replace(/ /g, "").toLowerCase();

    let user = await getUserByEmailDb(email);

    if (!user?.google_id) {
      user = await createUserGoogleDb({ sub, defaultUsername, email, name });
      await createCartDb(user.user_id);
      await mail.signupMail(user.email, user.fullname.split(" ")[0]);
    }

    const { user_id, cart_id, role, fullname, username } = await getUserByEmailDb(email);

    const tokenPayload = { id: user_id, role, cart_id };
    const token = this.signAccessToken(tokenPayload);
    const { rawToken: refreshToken, expiresAt } = this.signRefreshTokenRaw(tokenPayload);

    await storeRefreshTokenDb({ userId: user_id, rawToken: refreshToken, expiresAt });

    logger.info({ event: "GOOGLE_LOGIN_SUCCESS", userId: user_id });

    return { token, refreshToken, user: { user_id, fullname, username, role } };
  }

  // ── Refresh Token Rotation ────────────────────────────────────────────────

  async generateRefreshToken(rawRefreshToken) {
    // 1. Verify JWT signature
    let payload;
    try {
      payload = jwt.verify(rawRefreshToken, getPublicKey(), { algorithms: ["RS256"] });
    } catch (err) {
      logger.warn({ event: "REFRESH_FAILURE", reason: "JWT verification failed", err: err.message });
      throw new ErrorHandler(401, "Invalid or expired refresh token");
    }

    // 2. Check DB — must exist, not revoked, not expired
    const isValid = await isValidRefreshTokenDb(rawRefreshToken);
    if (!isValid) {
      logger.warn({
        event: "REFRESH_FAILURE",
        reason: "Token revoked or not found in DB",
        userId: payload.id,
      });
      throw new ErrorHandler(401, "Refresh token has been revoked");
    }

    // 3. Revoke the consumed token (rotation)
    await revokeRefreshTokenDb(rawRefreshToken);

    // 4. Issue a new pair
    const tokenPayload = { id: payload.id, role: payload.role, cart_id: payload.cart_id };
    const token = this.signAccessToken(tokenPayload);
    const { rawToken: newRefreshToken, expiresAt } = this.signRefreshTokenRaw(tokenPayload);

    await storeRefreshTokenDb({
      userId: payload.id,
      rawToken: newRefreshToken,
      expiresAt,
    });

    logger.info({ event: "REFRESH_SUCCESS", userId: payload.id });

    return { token, refreshToken: newRefreshToken };
  }

  // ── Forgot Password ────────────────────────────────────────────────────────

  async forgotPassword(email) {
    const user = await getUserByEmailDb(email);
    if (!user) {
      // Don't reveal whether the email exists — log and silently succeed
      logger.warn({ event: "FORGOT_PASSWORD_NOTFOUND", email });
      return;
    }

    await setTokenStatusDb(email);
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(resetToken);
    const expireDate = moment().add(60, "minutes").format();

    await createResetTokenDb({ email, expireDate, fpSalt: resetToken, tokenHash });
    await mail.forgotPasswordMail(resetToken, email);

    logger.info({ event: "FORGOT_PASSWORD_SENT", email });
  }

  // ── Verify Reset Token ─────────────────────────────────────────────────────

  async verifyResetToken(token, email) {
    const curDate = moment().format();
    await deleteResetTokenDb(curDate);
    const tokenHash = hashResetToken(token);
    return await isValidTokenDb({ tokenHash, token, email, curDate });
  }

  // ── Reset Password ─────────────────────────────────────────────────────────

  async resetPassword(password, password2, token, email) {
    // password matching is enforced by Joi schema; guard here for service safety
    if (password !== password2) {
      throw new ErrorHandler(400, "Passwords do not match");
    }

    const curDate = moment().format();
    const tokenHash = hashResetToken(token);
    const isTokenValid = await isValidTokenDb({ tokenHash, token, email, curDate });

    if (!isTokenValid) {
      logger.warn({ event: "RESET_PASSWORD_FAILURE", reason: "Invalid or expired token", email });
      throw new ErrorHandler(400, "Token not found. Please initiate password reset again.");
    }

    await setTokenStatusDb(email);
    const hashedPassword = await hashPassword(password);
    await changeUserPasswordDb(hashedPassword, email);
    await mail.resetPasswordMail(email);

    logger.info({ event: "RESET_PASSWORD_SUCCESS", email });
  }

  // ── Google OAuth helper ────────────────────────────────────────────────────

  async verifyGoogleIdToken(code) {
    const oauthClient = new OAuth2Client(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET,
      "postmessage"
    );
    const { tokens } = await oauthClient.getToken(code);
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.OAUTH_CLIENT_ID,
    });
    return ticket;
  }

  // ── Token signing ──────────────────────────────────────────────────────────

  /**
   * Sign a short-lived RS256 access token (15 minutes).
   * @param {object} data — { id, role, cart_id }
   * @returns {string} signed JWT
   */
  signAccessToken(data) {
    return jwt.sign(data, getPrivateKey(), {
      algorithm: "RS256",
      expiresIn: "15m",
    });
  }

  /**
   * Sign a long-lived RS256 refresh token (7 days).
   * Returns both the raw token and its expiry Date for DB storage.
   * @param {object} data — { id, role, cart_id }
   * @returns {{ rawToken: string, expiresAt: Date }}
   */
  signRefreshTokenRaw(data) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const rawToken = jwt.sign(data, getPrivateKey(), {
      algorithm: "RS256",
      expiresIn: "7d",
    });
    return { rawToken, expiresAt };
  }

  /**
   * Sign a short-lived MFA challenge token (5 minutes).
   * @param {object} data — { id, email }
   * @returns {string} signed JWT
   */
  signMfaToken(data) {
    return jwt.sign({ ...data, type: "mfa" }, getPrivateKey(), {
      algorithm: "RS256",
      expiresIn: "5m",
    });
  }

  // ── MFA Setup ───────────────────────────────────────────────────────────

  async initMfaSetup(email, password) {
    if (!isBasicInputValid(email, password)) {
      logger.warn({ event: "MFA_SETUP_FAILURE", reason: "Invalid input", email });
      throw new ErrorHandler(401, "Invalid credentials");
    }

    const user = await getUserByEmailDb(email);
    if (!user) {
      await bcrypt.hash(password, BCRYPT_ROUNDS);
      logger.warn({ event: "MFA_SETUP_FAILURE", reason: "Email not found", email });
      throw new ErrorHandler(401, "Email or password incorrect");
    }

    if (user.google_id && !user.password) {
      logger.warn({ event: "MFA_SETUP_FAILURE", reason: "Google-only account", email });
      throw new ErrorHandler(403, "Please log in with Google");
    }

    if (user.is_mfa_enabled) {
      logger.warn({ event: "MFA_SETUP_FAILURE", reason: "Already enabled", userId: user.user_id });
      throw new ErrorHandler(400, "MFA is already enabled for this account");
    }

    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if (!isCorrectPassword) {
      logger.warn({ event: "MFA_SETUP_FAILURE", reason: "Wrong password", userId: user.user_id });
      throw new ErrorHandler(401, "Email or password incorrect");
    }

    const secret = speakeasy.generateSecret({
      name: `Vantage (${email})`,
      issuer: "Vantage",
    });

    const { secretEnc, secretIv, secretTag } = encryptMfaSecret(secret.base32);
    await setUserMfaSecretDb({ userId: user.user_id, secretEnc, secretIv, secretTag });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    logger.info({ event: "MFA_SETUP_ISSUED", userId: user.user_id });

    return { qrCodeDataUrl, otpauthUrl: secret.otpauth_url };
  }

  async verifyMfaSetup(email, password, code) {
    if (!isBasicInputValid(email, password)) {
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Invalid input", email });
      throw new ErrorHandler(401, "Invalid credentials");
    }

    const user = await getUserByEmailDb(email);
    if (!user) {
      await bcrypt.hash(password, BCRYPT_ROUNDS);
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Email not found", email });
      throw new ErrorHandler(401, "Email or password incorrect");
    }

    if (user.google_id && !user.password) {
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Google-only account", email });
      throw new ErrorHandler(403, "Please log in with Google");
    }

    if (user.is_mfa_enabled) {
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Already enabled", userId: user.user_id });
      throw new ErrorHandler(400, "MFA is already enabled for this account");
    }

    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if (!isCorrectPassword) {
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Wrong password", userId: user.user_id });
      throw new ErrorHandler(401, "Email or password incorrect");
    }

    if (!user.mfa_secret_enc || !user.mfa_secret_iv || !user.mfa_secret_tag) {
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Missing secret", userId: user.user_id });
      throw new ErrorHandler(400, "MFA setup has not been initiated");
    }

    const secret = decryptMfaSecret({
      secretEnc: user.mfa_secret_enc,
      secretIv: user.mfa_secret_iv,
      secretTag: user.mfa_secret_tag,
    });

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!isValid) {
      logger.warn({ event: "MFA_VERIFY_FAILURE", reason: "Invalid code", userId: user.user_id });
      throw new ErrorHandler(400, "Invalid MFA code");
    }

    await enableUserMfaDb(user.user_id);
    logger.info({ event: "MFA_ENABLED", userId: user.user_id });

    return true;
  }

  // ── MFA Login Challenge ─────────────────────────────────────────────────

  async loginMfa(mfaToken, code) {
    let payload;
    try {
      payload = jwt.verify(mfaToken, getPublicKey(), { algorithms: ["RS256"] });
    } catch (err) {
      logger.warn({ event: "MFA_LOGIN_FAILURE", reason: "Invalid token", err: err.message });
      throw new ErrorHandler(401, "Invalid or expired MFA token");
    }

    if (payload.type !== "mfa") {
      logger.warn({ event: "MFA_LOGIN_FAILURE", reason: "Wrong token type" });
      throw new ErrorHandler(401, "Invalid MFA token");
    }

    const user = await getUserByIdDb(payload.id);
    if (!user) {
      logger.warn({ event: "MFA_LOGIN_FAILURE", reason: "User not found", userId: payload.id });
      throw new ErrorHandler(401, "Invalid MFA token");
    }

    if (!user.is_mfa_enabled) {
      logger.warn({ event: "MFA_LOGIN_FAILURE", reason: "MFA not enabled", userId: user.user_id });
      throw new ErrorHandler(400, "MFA is not enabled for this account");
    }

    if (!user.mfa_secret_enc || !user.mfa_secret_iv || !user.mfa_secret_tag) {
      logger.error({ event: "MFA_SECRET_MISSING", userId: user.user_id });
      throw new ErrorHandler(500, "MFA is enabled but not configured");
    }

    const secret = decryptMfaSecret({
      secretEnc: user.mfa_secret_enc,
      secretIv: user.mfa_secret_iv,
      secretTag: user.mfa_secret_tag,
    });

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!isValid) {
      logger.warn({ event: "MFA_LOGIN_FAILURE", reason: "Invalid code", userId: user.user_id });
      throw new ErrorHandler(401, "Invalid MFA code");
    }

    const tokenPayload = { id: user.user_id, role: user.role, cart_id: user.cart_id };
    const token = this.signAccessToken(tokenPayload);
    const { rawToken: refreshToken, expiresAt } = this.signRefreshTokenRaw(tokenPayload);

    await storeRefreshTokenDb({ userId: user.user_id, rawToken: refreshToken, expiresAt });

    logger.info({ event: "MFA_LOGIN_SUCCESS", userId: user.user_id });

    return {
      token,
      refreshToken,
      user: {
        user_id: user.user_id,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
      },
    };
  }
}

module.exports = new AuthService();
