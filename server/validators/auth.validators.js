/**
 * auth.validators.js
 * Joi schemas for all authentication endpoints.
 */
const Joi = require("joi");

// ── Shared rules ────────────────────────────────────────────────────────────

const passwordRule = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
  .required()
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.pattern.base":
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    "any.required": "Password is required",
  });

const mfaCodeRule = Joi.string()
  .length(6)
  .pattern(/^\d+$/)
  .required()
  .messages({
    "string.length": "MFA code must be 6 digits",
    "string.pattern.base": "MFA code must contain only digits",
    "any.required": "MFA code is required",
  });

// ── Schemas ─────────────────────────────────────────────────────────────────

const signupSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "any.required": "Email is required",
  }),
  password: passwordRule,
  fullname: Joi.string().min(2).max(100).required().messages({
    "string.min": "Full name must be at least 2 characters",
    "any.required": "Full name is required",
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.alphanum": "Username must only contain alphanumeric characters",
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must be at most 30 characters",
    "any.required": "Username is required",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "Password is required",
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "any.required": "Email is required",
  }),
});

const checkTokenSchema = Joi.object({
  token: Joi.string().required().messages({ "any.required": "Token is required" }),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

const resetPasswordSchema = Joi.object({
  password: passwordRule,
  password2: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Password confirmation is required",
  }),
  token: Joi.string().required().messages({ "any.required": "Reset token is required" }),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

const googleLoginSchema = Joi.object({
  code: Joi.string().required().messages({ "any.required": "Google auth code is required" }),
});

const mfaSetupSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "Password is required",
  }),
});

const mfaVerifySchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "Password is required",
  }),
  code: mfaCodeRule,
});

const mfaLoginSchema = Joi.object({
  mfa_token: Joi.string().required().messages({ "any.required": "MFA token is required" }),
  code: mfaCodeRule,
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  checkTokenSchema,
  resetPasswordSchema,
  googleLoginSchema,
  mfaSetupSchema,
  mfaVerifySchema,
  mfaLoginSchema,
};
