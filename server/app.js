const express = require("express");
require("express-async-errors");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const helmet = require("helmet");
const compression = require("compression");
const unknownEndpoint = require("./middleware/unKnownEndpoint");
const { handleError } = require("./helpers/error");
const { logger, morganStream } = require("./utils/logger");
const { globalLimiter } = require("./middleware/rateLimiter");

const app = express();

// ── Trust proxy (Heroku / reverse proxies) ──────────────────────────────────
app.set("trust proxy", 1);

// ── Security Headers — Helmet v7 with strict CSP ───────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://accounts.google.com/gsi/client"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // 'unsafe-inline' needed for Razorpay/Google
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://lumberjack.razorpay.com",
          "https://accounts.google.com",
        ],
        frameSrc: ["https://api.razorpay.com", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,           // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
}));

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Limit payload size

// ── HTTP request logging (Morgan → Winston) ─────────────────────────────────
app.use(morgan("combined", { stream: morganStream }));

// ── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ── Cookie parsing ──────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Global rate limiter (100 req / 15 min) ───────────────────────────────────
app.use(globalLimiter);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", routes);

app.get("/", (req, res) =>
  res.send("<h1 style='text-align: center'>E-COMMERCE API</h1>")
);

// ── Error handling ───────────────────────────────────────────────────────────
app.use(unknownEndpoint);
app.use(handleError);

module.exports = app;
