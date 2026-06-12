# PERN Stack Secure E-Commerce Application

## Complete Architecture & Deployment Guide

**Document Version:** 1.0  
**Date:** June 2024  
**Application:** Vantage (PERN-Store) - Secure Web Application  
**Status:** Production Ready

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Design](#database-design)
7. [Docker & Container Architecture](#docker--container-architecture)
8. [Networking & Data Flow](#networking--data-flow)
9. [Security Implementation](#security-implementation)
10. [Deployment Strategy](#deployment-strategy)
11. [Performance & Scalability](#performance--scalability)
12. [Monitoring & Logging](#monitoring--logging)

---

## EXECUTIVE SUMMARY

The Vantage application is a secure, production-ready PERN (PostgreSQL, Express, React, Node.js) e-commerce platform built with enterprise-grade security, defense-in-depth architecture, and containerized deployment.

**Key Characteristics:**

- **Three-Tier Architecture**: Frontend, API Layer, Database
- **Network Segmentation**: DMZ-based with isolated zones
- **Zero-Trust Authentication**: RS256 JWT + MFA support
- **Containerized Deployment**: Docker Compose with multi-network isolation
- **Security-First Design**: Helmet, rate limiting, input validation, encryption
- **Scalable Infrastructure**: Horizontal scaling via container orchestration

---

## SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET/USERS                              │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTP/HTTPS:80,443
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  NGINX REVERSE PROXY (DMZ)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ • Security Headers (CSP, HSTS, X-Frame-Options)             │  │
│  │ • Rate Limiting (General: 10req/s, Auth: 2req/s)            │  │
│  │ • SSL/TLS Termination (Let's Encrypt)                       │  │
│  │ • Static File Serving (React Build)                         │  │
│  │ • Gzip Compression                                           │  │
│  │ • Load Balancing to API                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                        frontend-net bridge                          │
└─────────────────────────────────────────────────────────────────────┘
                          │ Internal:9000
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               NODE.JS EXPRESS API (APP TIER)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ • REST Endpoints (/api/*)                                   │  │
│  │ • JWT Authentication (RS256)                                │  │
│  │ • MFA/OAuth Support                                         │  │
│  │ • Business Logic & Validation                               │  │
│  │ • Payment Processing (Razorpay)                             │  │
│  │ • Email Service                                             │  │
│  │ • Audit Logging                                             │  │
│  │ • Security Middleware Stack                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│        frontend-net                          backend-net            │
└─────────────────────────────────────────────────────────────────────┘
                          │ Internal:5432
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│            POSTGRESQL 16 DATABASE (DATA TIER)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ • Users & Authentication                                    │  │
│  │ • Products & Reviews                                        │  │
│  │ • Orders & Transactions                                     │  │
│  │ • Cart Management                                           │  │
│  │ • Refresh Token Revocation                                  │  │
│  │ • Audit Logs                                                │  │
│  │ • Volume Persistence (pgdata)                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                        backend-net bridge                           │
│                    (NO external access)                             │
└─────────────────────────────────────────────────────────────────────┘

CRITICAL SECURITY PRINCIPLE:
- Nginx CANNOT reach PostgreSQL directly (network isolation)
- All requests must flow through the API layer
- Database is in an isolated backend network
```

### Defense-in-Depth Model

```
┌──────────────────────────────────────────────┐
│ ZONE 1: WEB TIER (DMZ)                       │
│ ├─ Nginx Reverse Proxy                       │
│ ├─ Public-facing endpoint                    │
│ └─ Restricted to HTTP(S) only               │
└────────────┬─────────────────────────────────┘
             │ (firewall rules)
┌────────────▼─────────────────────────────────┐
│ ZONE 2: APP TIER (Internal)                  │
│ ├─ Node.js Express API                       │
│ ├─ Authentication & Authorization            │
│ ├─ Business Logic                            │
│ ├─ Bridges DMZ ↔ Database tier               │
│ └─ Not directly exposed                      │
└────────────┬─────────────────────────────────┘
             │ (network bridge)
┌────────────▼─────────────────────────────────┐
│ ZONE 3: DATA TIER (Locked)                   │
│ ├─ PostgreSQL Database                       │
│ ├─ Internal network only                     │
│ ├─ No external connectivity                  │
│ └─ Access via API layer exclusively          │
└──────────────────────────────────────────────┘
```

---

## TECHNOLOGY STACK

### Frontend Stack

```
Framework:           React 18 with React Router v6
Build Tool:          Vite (modern bundler)
Styling:             Tailwind CSS + PostCSS
UI Components:       Windmill UI
State Management:    React Context API
HTTP Client:         Axios with interceptors
Authentication:      JWT from localStorage
Payment Gateway:     Razorpay SDK
```

### Backend Stack

```
Runtime:             Node.js 16+
Framework:           Express.js 4.18
Authentication:      JWT (RS256), Bcrypt, TOTP
Validation:          Joi schema validation
Database:            PostgreSQL 16 with pg client
Logging:             Winston + Morgan
Security:            Helmet, express-rate-limit
Email:               Nodemailer (SMTP)
Payment:             Razorpay API
Encryption:          AES-256-GCM (MFA secrets)
```

### Infrastructure Stack

```
Containerization:    Docker & Docker Compose
Reverse Proxy:       Nginx 1.25 Alpine
Database:            PostgreSQL 16 Alpine
Networking:          Docker bridge networks
Firewall:            UFW (Ubuntu Firewall)
Intrusion Prevent:   Fail2Ban
Security Hardening:  Ubuntu 22.04 LTS
SSL/TLS:             Let's Encrypt + Certbot
```

---

## BACKEND ARCHITECTURE

### API Route Structure

#### 1. Authentication Routes (`/api/auth`)

```
Endpoint                          Method    Rate Limit    Purpose
─────────────────────────────────────────────────────────────────────
/auth/signup                       POST     10/15min     Create account
/auth/login                        POST     10/15min     Email/Password login
/auth/google                       POST     10/15min     OAuth 2.0 Google
/auth/logout                       POST     -            Revoke tokens
/auth/forgot-password              POST     -            Password reset request
/auth/check-token                  POST     -            Verify reset token
/auth/reset-password               POST     -            Complete reset
/auth/refresh-token                POST     -            Issue new access token
/auth/mfa/setup                    POST     -            Initialize TOTP MFA
/auth/mfa/verify                   POST     -            Verify & enable MFA
/auth/mfa/remove                   POST     -            Disable MFA
/auth/login/mfa                    POST     -            Complete MFA login
```

#### 2. User Management Routes (`/api/users`)

```
Endpoint                          Method    Auth Required    Role Required
──────────────────────────────────────────────────────────────────────
GET    /users                     YES        ADMIN
POST   /users                     YES        ADMIN
GET    /users/profile             YES        USER
GET    /users/:id                 YES        SELF/ADMIN
PUT    /users/:id                 YES        SELF/ADMIN
DELETE /users/:id                 YES        SELF/ADMIN
```

#### 3. Products Routes (`/api/products`)

```
Endpoint                          Method    Auth Required    Role Required
──────────────────────────────────────────────────────────────────────
GET    /products                  NO         -
POST   /products                  YES        ADMIN
GET    /products/:slug            NO         -
PUT    /products/:slug            YES        ADMIN
DELETE /products/:slug            YES        ADMIN
GET    /products/:id/reviews      NO         -
POST   /products/:id/reviews      YES        USER
PUT    /products/:id/reviews      YES        SELF/ADMIN
```

#### 4. Cart Routes (`/api/cart`)

```
Endpoint                          Method    Auth Required
──────────────────────────────────────────────────────────
GET    /cart                      YES
POST   /cart/add                  YES
DELETE /cart/delete               YES
PUT    /cart/increment            YES
PUT    /cart/decrement            YES
```

#### 5. Orders Routes (`/api/orders`)

```
Endpoint                          Method    Auth Required
──────────────────────────────────────────────────────────
POST   /orders/create             YES
GET    /orders                    YES
GET    /orders/:id                YES
```

#### 6. Payment Routes (`/api/payment`)

```
Endpoint                          Method    Auth Required    Purpose
──────────────────────────────────────────────────────────────────────
POST   /payment/order             YES        USER        Create Razorpay order
POST   /payment/verify            YES        USER        Verify payment signature
```

### Controller & Service Architecture

```
┌─────────────────────────────────────────────┐
│         INCOMING HTTP REQUEST               │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│    MIDDLEWARE STACK (In Sequence)           │
├─────────────────────────────────────────────┤
│ 1. cors() - Cross-origin validation        │
│ 2. helmet() - Security headers             │
│ 3. express.json() - Parse JSON body        │
│ 4. compression() - Gzip responses          │
│ 5. morgan() - HTTP logging                 │
│ 6. cookieParser() - Parse cookies          │
│ 7. globalLimiter - Rate limiting (100/15m) │
│ 8. validate(schema) - Input validation     │
│ 9. verifyToken - JWT authentication        │
│ 10. verifyAdmin - RBAC authorization       │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         ROUTE HANDLERS (Controllers)        │
├─────────────────────────────────────────────┤
│ • Request validation                        │
│ • Business logic orchestration              │
│ • Service method invocation                 │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         SERVICE LAYER                       │
├─────────────────────────────────────────────┤
│ • Reusable business logic                   │
│ • Data transformation                       │
│ • External service calls (email, payment)   │
│ • Encryption/hashing operations             │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         DATABASE LAYER (db/)                │
├─────────────────────────────────────────────┤
│ • Parameterized SQL queries                 │
│ • Connection pooling                        │
│ • Query result mapping                      │
│ • Transaction management                    │
└────────────────┬────────────────────────────┘
                 │
        ┌────────▼────────┐
        │   PostgreSQL    │
        └─────────────────┘
```

### Authentication Flow Diagram

```
USER LOGIN FLOW:
┌─────────────┐
│ User enters │
│ credentials │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ POST /auth/login     │
│ Body: {              │
│  email: string,      │
│  password: string    │
│ }                    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Controller: auth.controller.js       │
│ - Find user by email                 │
│ - Verify password (bcrypt)           │
│ - Check MFA enabled?                 │
└──────┬───────────────────────────────┘
       │
       ├─── MFA Enabled ──────┐
       │                      │
       │                      ▼
       │                 Return: {
       │                  mfa_required: true,
       │                  mfa_token: JWT
       │                 }
       │                      │
       │                      ▼
       │                 POST /auth/login/mfa
       │                 Body: {
       │                  mfa_token: JWT,
       │                  code: 6-digit TOTP
       │                 }
       │                      │
       │                      ▼
       │                 Verify TOTP code
       │
       └─── MFA Disabled ────┐
                             │
                             ▼
                        Generate Tokens:
                        - accessToken (15m): RS256
                        - refreshToken (7d): RS256
                        - Hash refresh token (SHA-256)
                             │
                             ▼
                        Store refresh token hash in DB
                             │
                             ▼
                        Set Cookies:
                        - accessToken (HttpOnly, Secure, SameSite=Strict)
                        - refreshToken (HttpOnly, Secure, SameSite=Strict)
                             │
                             ▼
                        Return 200 OK
                        {
                         user_id: number,
                         email: string,
                         role: 'user'|'admin',
                         message: "Login successful"
                        }
```

### Token Refresh Flow

```
CLIENT SENDS EXPIRED ACCESS TOKEN:
┌──────────────────────────┐
│ Browser sends request    │
│ with accessToken cookie  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ verifyToken middleware   │
│ - Decode token           │
│ - Verify signature       │
│ - Check expiration       │
└──────┬───────────────────┘
       │
       ├─── Token Valid ──────────► Continue to handler
       │
       └─── Token Expired ────────┐
                                  │
                                  ▼
                          Return 401 Unauthorized
                          Client receives 401
                                  │
                                  ▼
                          POST /auth/refresh-token
                          (sends refreshToken cookie)
                                  │
                                  ▼
                          Find refresh token hash in DB
                          - Verify signature
                          - Check expiration
                          - Check not revoked
                                  │
                                  ├─ Valid ──────────┐
                                  │                  │
                                  │                  ▼
                                  │          Issue new accessToken
                                  │          (rotate refresh token optional)
                                  │                  │
                                  │                  ▼
                                  │          Set new accessToken cookie
                                  │                  │
                                  │                  ▼
                                  │          Return 200 OK
                                  │
                                  └─ Invalid ──────┐
                                                   │
                                                   ▼
                                            Return 401 Unauthorized
                                            User must login again
```

---

## FRONTEND ARCHITECTURE

### Component Hierarchy

```
App.jsx (Root)
│
├── Routes Configuration
│   ├── ProtectedRoute (Auth required)
│   │   ├── /account → Account.jsx
│   │   ├── /cart/checkout → Checkout.jsx
│   │   ├── /orders → Orders.jsx
│   │   └── /orders/:id → OrderDetails.jsx
│   │
│   ├── AdminRoute (Admin only)
│   │   └── /admin → AdminDashboard.jsx
│   │
│   └── Public Routes
│       ├── / → ProductList.jsx
│       ├── /products/:slug → ProductDetails.jsx
│       ├── /cart → Cart.jsx
│       ├── /login → Login.jsx
│       ├── /signup → Register.jsx
│       ├── /reset-password → ResetPassword.jsx
│       └── * → 404.jsx
│
├── Context Providers
│   ├── UserContext
│   ├── ProductContext
│   ├── CartContext
│   ├── OrderContext
│   └── ReviewContext
│
└── Layout.jsx
    ├── Nav.jsx (Navigation)
    └── Routes
        └── [Active Page Component]
```

### State Management (Context API)

```
1. UserContext
   ├─ State:
   │  ├─ userData: { id, email, role, fullname, address, ... }
   │  ├─ authData: { accessToken, refreshToken }
   │  └─ isLoggedIn: boolean
   │
   ├─ Methods:
   │  ├─ setUserInfo(userData)
   │  ├─ updateUserData(fields)
   │  ├─ logout()
   │  └─ refreshToken()
   │
   └─ Initialization:
      └─ Load from localStorage on app mount
      └─ Call /api/users/profile to verify token

2. ProductContext
   ├─ State:
   │  ├─ products: Product[]
   │  ├─ currentPage: number
   │  ├─ totalPages: number
   │  ├─ loading: boolean
   │  └─ error: string | null
   │
   ├─ Methods:
   │  ├─ fetchProducts(page)
   │  └─ setProducts(products)
   │
   └─ Initialization:
      └─ Fetch page 1 on mount

3. CartContext
   ├─ State:
   │  ├─ cartItems: CartItem[]
   │  ├─ totalPrice: number
   │  ├─ totalItems: number
   │  └─ loading: boolean
   │
   ├─ Methods:
   │  ├─ addToCart(productId, qty)
   │  ├─ removeFromCart(productId)
   │  ├─ updateQty(productId, newQty)
   │  └─ fetchCart()
   │
   └─ Sync:
      └─ Whenever cart changes, call /api/cart

4. OrderContext
   ├─ State:
   │  ├─ orders: Order[]
   │  ├─ selectedOrder: Order | null
   │  └─ loading: boolean
   │
   ├─ Methods:
   │  ├─ fetchOrders()
   │  └─ selectOrder(orderId)
   │
   └─ Access:
      └─ Protected: Requires authentication

5. ReviewContext
   ├─ State:
   │  ├─ reviews: Review[]
   │  ├─ userReview: Review | null
   │  └─ loading: boolean
   │
   ├─ Methods:
   │  ├─ fetchReviews(productId)
   │  ├─ submitReview(productId, content, rating)
   │  └─ updateReview(productId, content, rating)
   │
   └─ Access:
      └─ Create/Update: Requires authentication
```

### API Integration Layer

```
services/ Directory
├── auth.service.js
│   ├─ login(email, password)
│   ├─ signup(userData)
│   ├─ googleLogin(code)
│   ├─ logout()
│   ├─ mfaSetup(email, password)
│   ├─ mfaVerify(mfaToken, code)
│   ├─ forgotPassword(email)
│   ├─ resetPassword(token, email, password)
│   └─ removeMfa()
│
├── product.service.js
│   ├─ getProducts(page)
│   ├─ getProductBySlug(slug)
│   ├─ createProduct(data)
│   ├─ updateProduct(slug, data)
│   └─ deleteProduct(slug)
│
├── cart.service.js
│   ├─ getCart()
│   ├─ addItem(productId, qty)
│   ├─ removeItem(productId)
│   ├─ increaseQty(productId)
│   └─ decreaseQty(productId)
│
├── order.service.js
│   ├─ createOrder(items, address)
│   ├─ getOrders()
│   └─ getOrderById(id)
│
└── review.service.js
    ├─ getReviews(productId)
    ├─ createReview(productId, content, rating)
    └─ updateReview(productId, content, rating)

All services use Axios with:
- Base URL: API_URL (configurable)
- Credentials: include (cookies sent)
- Automatic token refresh on 401
```

---

## DATABASE DESIGN

### Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ users (USER_ID primary key)                                  │
├──────────────────────────────────────────────────────────────┤
│ ├─ user_id (SERIAL PRIMARY KEY)                              │
│ ├─ email (VARCHAR UNIQUE) ◄─ Indexed (lowercase)            │
│ ├─ username (VARCHAR UNIQUE) ◄─ Indexed (lowercase)         │
│ ├─ password (VARCHAR - bcrypt hash)                          │
│ ├─ fullname (VARCHAR)                                        │
│ ├─ google_id (VARCHAR UNIQUE - OAuth)                        │
│ ├─ role (VARCHAR DEFAULT 'user') ◄─ 'user' or 'admin'       │
│ ├─ is_mfa_enabled (BOOLEAN DEFAULT false)                    │
│ ├─ mfa_secret_enc (TEXT - AES-256-GCM encrypted)            │
│ ├─ mfa_secret_iv (TEXT - Initialization Vector)             │
│ ├─ mfa_secret_tag (TEXT - Auth Tag)                         │
│ ├─ address (VARCHAR)                                         │
│ ├─ city, state, country (VARCHAR)                            │
│ └─ created_at (TIMESTAMP DEFAULT now())                      │
└──────────────────────────────────────────────────────────────┘
           │                            │
           │ 1                          │ 1
           │ (has)                      │ (has)
           │                            │
┌──────────▼──────────────┐   ┌────────▼─────────────────┐
│ cart (USER_ID UNIQUE)   │   │ orders (USER_ID indexed) │
├─────────────────────────┤   ├──────────────────────────┤
│ ├─ id (SERIAL PK)       │   │ ├─ order_id (SERIAL PK)  │
│ ├─ user_id (FK→users)   │   │ ├─ user_id (FK→users)    │
│ └─ (created_at)         │   │ ├─ status (VARCHAR)      │
│                         │   │ ├─ date (TIMESTAMP)      │
│           │             │   │ ├─ amount (REAL)         │
│           │ 1           │   │ ├─ total (INTEGER)       │
│           │ (contains)  │   │ ├─ ref (VARCHAR)         │
│           │             │   │ ├─ payment_method       │
│           │             │   │ └─ (payment ref)         │
│           │             │   │
│           ▼             │   │          │
│    ┌──────────────────┐ │   │          │ 1
│    │ cart_item        │ │   │          │ (contains)
│    ├──────────────────┤ │   │          │
│    │ id (SERIAL PK)   │ │   │          ▼
│    │ cart_id (FK)     │─┘   │     ┌────────────────┐
│    │ product_id (FK)  │     │     │ order_item     │
│    │ quantity > 0     │     │     ├────────────────┤
│    └──────────────────┘     │     │ id (SERIAL PK) │
│           │                 │     │ order_id (FK)  │
│           │                 │     │ product_id(FK) │
│           │ N:M             │     │ quantity       │
│           │                 │     └────────────────┘
│           │                 │            │
└───────────┼─────────────────┘            │ M:1
            │                              │
            │                    ┌─────────┘
            │                    │
            ├─────────┬──────────┤
            │         │          │
┌───────────▼──┐   ┌──▼──────────────┐
│ products     │   │ reviews         │
├──────────────┤   ├─────────────────┤
│ product_id PK   │ (user_id,        │
│ name (UNIQUE)   │  product_id) PK  │
│ slug (UNIQUE)   │ user_id (FK)     │
│ price (REAL)    │ product_id (FK)  │
│ description     │ content (TEXT)   │
│ image_url       │ rating 1-5       │
└──────────────┘   │ date            │
                   └─────────────────┘
```

### Table Definitions

#### Users Table

```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  password VARCHAR(200),                    -- bcrypt hash (cost: 12)
  email VARCHAR(100) NOT NULL UNIQUE,       -- Indexed (lowercase)
  fullname VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,     -- Indexed (lowercase)
  google_id VARCHAR(100) UNIQUE,            -- OAuth identifier
  role VARCHAR(10) DEFAULT 'user',          -- 'user' or 'admin'
  is_mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret_enc TEXT,                      -- AES-256-GCM encrypted
  mfa_secret_iv TEXT,                       -- Initialization Vector (12 bytes)
  mfa_secret_tag TEXT,                      -- Authentication Tag (16 bytes)
  address VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));
```

**Key Security Notes:**

- Password: Bcrypt hashed with cost=12 (>150ms computation)
- MFA Secret: Encrypted with AES-256-GCM before storage
- Email/Username: Case-insensitive unique indexes prevent duplicates

#### Products Table

```sql
CREATE TABLE products (
  product_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,        -- URL-safe identifier (name + hex)
  price REAL NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255)
);
```

#### Orders Table

```sql
CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,              -- 'pending', 'complete', 'failed'
  date TIMESTAMP DEFAULT CURRENT_DATE NOT NULL,
  amount REAL,                              -- Total order value
  total INTEGER,                            -- Item count
  ref VARCHAR(100),                         -- Payment reference (Razorpay ID)
  payment_method VARCHAR(20),               -- 'RAZORPAY', 'STRIPE', etc.
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX orders_user_id_idx ON orders(user_id);
```

#### Cart Tables

```sql
CREATE TABLE cart (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE cart_item (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE(cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);
```

#### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,          -- SHA-256 hash of JWT
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_expiry_idx ON refresh_tokens(expires_at);
```

#### Reviews Table

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  date DATE NOT NULL,
  UNIQUE(user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE INDEX reviews_product_id_idx ON reviews(product_id);
```

### Data Integrity Constraints

- **NOT NULL**: Required fields cannot be missing
- **UNIQUE**: Enforced uniqueness (email, username, product name, slug)
- **CHECK**: Quantity > 0, Rating 1-5
- **FOREIGN KEY CASCADE**: Cascading deletes (user → orders, cart items)
- **FOREIGN KEY SET NULL**: Optional references nullified on parent delete
- **PRIMARY KEY**: Single row identifier

---

## DOCKER & CONTAINER ARCHITECTURE

### Docker Compose Structure (Production)

```yaml
version: '3.8'

services:
  # ════════════════════════════════════════════════════════════
  # NGINX: Reverse Proxy (DMZ) - Externally Exposed
  # ════════════════════════════════════════════════════════════
  nginx:
    image: nginx:1.25-alpine
    container_name: pern-prod-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./server/config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./client/dist:/var/www/html:ro
      - ./certs/:/etc/nginx/ssl/:ro                (optional SSL)
    networks:
      - frontend-net
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /var/cache/nginx:size=10M
      - /var/run:size=1M
      - /tmp:size=5M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=nginx"
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ════════════════════════════════════════════════════════════
  # NODE.JS API: Application Tier (Internal Only)
  # ════════════════════════════════════════════════════════════
  api:
    image: pern-store-api-prod
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: pern-prod-api
    restart: unless-stopped
    env_file:
      - ./server/.env                         (Contains secrets)
    environment:
      - NODE_ENV=production
      - PORT=9000
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - JWT_EXPIRES_IN=15m
      - JWT_REFRESH_EXPIRES_IN=7d
      - ALLOWED_ORIGINS=http://yourdomain.com,http://localhost
    ports: {}                                 (NO external port)
    expose:
      - "9000"                               (Only to Docker network)
    networks:
      - frontend-net                         (Connected to Nginx)
      - backend-net                          (Connected to DB)
    depends_on:
      postgres:
        condition: service_healthy
    security_opt:
      - no-new-privileges:true
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=api"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  # ════════════════════════════════════════════════════════════
  # POSTGRESQL: Database Tier (Isolated, No External Access)
  # ════════════════════════════════════════════════════════════
  postgres:
    image: postgres:16-alpine
    container_name: pern-prod-db
    restart: unless-stopped
    env_file:
      - ./server/.env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports: {}                                 (NO external port)
    volumes:
      - pgdata:/var/lib/postgresql/data      (Persistent)
      - ./server/config/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
      - ./server/config/init-test.sh:/docker-entrypoint-initdb.d/02-init-test.sh:ro
    networks:
      - backend-net                          (ONLY isolated backend network)
    security_opt:
      - no-new-privileges:true
    command:
      - "postgres"
      - "-c"
      - "listen_addresses=*"
      - "-c"
      - "max_connections=100"
      - "-c"
      - "log_connections=on"
      - "-c"
      - "log_disconnections=on"
      - "-c"
      - "log_statement=ddl"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=postgres"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

# ════════════════════════════════════════════════════════════
# DOCKER NETWORKS: Network Segmentation (Defense-in-Depth)
# ════════════════════════════════════════════════════════════
networks:
  frontend-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16              (DMZ + API)
    driver_opts:
      "com.docker.network.driver.mtu": "1500"

  backend-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16              (API + Database only)
    driver_opts:
      "com.docker.network.driver.mtu": "1500"

# ════════════════════════════════════════════════════════════
# VOLUMES: Persistent Data Storage
# ════════════════════════════════════════════════════════════
volumes:
  pgdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/postgres                (Host path)
```

### Network Isolation Logic

```
┌─────────────────────────────────────────────────────────────┐
│ NETWORK SEGMENTATION                                        │
└─────────────────────────────────────────────────────────────┘

frontend-net (DMZ):
├─ Nginx container
├─ API container
└─ Subnet: 172.20.0.0/16

backend-net (Data Tier):
├─ API container (bridge via dual network)
├─ PostgreSQL container
└─ Subnet: 172.21.0.0/16

CRITICAL SECURITY MODEL:
✓ Nginx ←→ API (frontend-net bridge)
✓ API ←→ PostgreSQL (backend-net bridge)
✗ Nginx CANNOT reach PostgreSQL (no direct connection)
✗ External Internet CANNOT reach PostgreSQL (no exposed ports)
✗ External Internet CANNOT reach API (no exposed ports)

All internet traffic flows: Internet → Nginx:80/443 → API:9000 → PostgreSQL:5432
```

### Container Security Hardening

**Nginx Container:**

```yaml
security_opt:
  - no-new-privileges:true # Cannot escalate privileges
read_only: true # Read-only root filesystem
tmpfs:
  - /var/cache/nginx:size=10M # Ephemeral cache
  - /var/run:size=1M # Ephemeral runtime
  - /tmp:size=5M # Ephemeral tmp
user: nginx # Runs as non-root
```

**API Container:**

```yaml
security_opt:
  - no-new-privileges:true
# Runs as node (non-root in Dockerfile)
# No tmpfs needed (stateless)
```

**PostgreSQL Container:**

```yaml
security_opt:
  - no-new-privileges:true
# Runs as postgres user (non-root)
# Data volume is only persistent storage
```

### Docker Build Process

**Server Dockerfile:**

```dockerfile
# Multi-stage not needed for Node (lightweight runtime)
FROM node:16-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production --no-audit

# Copy application code
COPY . .

# Expose internal port (not mapped in production)
EXPOSE 9000

# Health check command
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s \
  CMD node -e 'require("http").get("http://localhost:9000/", res => { process.exit(res.statusCode === 200 ? 0 : 1) })'

# Start application
CMD ["npm", "start"]
```

**Client Dockerfile:**

```dockerfile
# Build stage
FROM node:16-alpine as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --legacy-peer-deps --no-audit

COPY . .

# Build React with Vite
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

# Copy built files to Nginx
COPY --from=build /usr/src/app/dist /var/www/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## NETWORKING & DATA FLOW

### Request Flow Diagram (Complete User Journey)

```
1. USER VISITS WEBSITE
┌──────────────────────┐
│ Browser opens        │
│ http://yourdomain.com│
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ REQUEST: HTTP GET /                                         │
│ From: User's IP (e.g., 203.0.113.1)                        │
│ To: yourdomain.com:80 (public internet)                     │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ NGINX REVERSE PROXY (173.20.0.2)                            │
│ ├─ Receives HTTP request                                    │
│ ├─ Checks security headers                                  │
│ ├─ Applies rate limiting (10 req/s)                         │
│ ├─ Serves React build from /var/www/html                    │
│ │  └─ index.html (with try_files fallback)                  │
│ ├─ Returns gzip-compressed response                         │
│ │  Includes headers:                                        │
│ │  ├─ Content-Security-Policy                              │
│ │  ├─ Strict-Transport-Security                            │
│ │  ├─ X-Frame-Options: deny                                │
│ │  └─ X-Content-Type-Options: nosniff                      │
│ └─ Sends response to browser                               │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Browser downloads    │
│ React app + JS       │
└──────┬───────────────┘
       │
       ▼ (React app initializes in browser)

2. USER LOGS IN
┌──────────────────────────────────────────────────────────────┐
│ User enters email & password                                 │
│ Clicks "Login" button                                        │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ React (client/src/pages/Login.jsx)                           │
│ ├─ Validates input locally (Joi schemas)                     │
│ ├─ Calls auth.service.login(email, password)                │
│ └─ Makes HTTP request                                       │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ REQUEST: HTTP POST /api/auth/login                           │
│ Headers:                                                     │
│  ├─ Content-Type: application/json                           │
│  ├─ Origin: http://localhost:3000                            │
│  └─ Credentials: include (send cookies)                      │
│ Body: { "email": "user@example.com", "password": "***" }    │
│                                                              │
│ From: Browser (172.20.0.3 - frontend-net)                   │
│ To: Nginx (172.20.0.2)                                      │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ NGINX (DMZ)                                                  │
│ ├─ Receives /api/* request                                   │
│ ├─ Checks rate limiting zone (auth: 2 req/s)               │
│ ├─ Proxies to upstream: http://api:9000/api/auth/login      │
│ │  X-Real-IP: 203.0.113.1 (user's real IP)                 │
│ │  X-Forwarded-For: 203.0.113.1                            │
│ │  X-Forwarded-Proto: http                                  │
│ └─ Waits for response                                       │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ NODE.JS API (172.20.0.3 - frontend-net bridge only)          │
│ ├─ Receives request on express.js server                     │
│ │                                                            │
│ ├─ MIDDLEWARE STACK:                                         │
│ │  1. cors() - Check origin (ALLOWED_ORIGINS env)           │
│ │     ✓ Allow origin: http://localhost:3000                 │
│ │                                                            │
│ │  2. helmet() - Security headers                            │
│ │     ✓ CSP, HSTS, X-Frame-Options, etc.                    │
│ │                                                            │
│ │  3. express.json() - Parse request body                    │
│ │     ✓ Body: { email, password }                           │
│ │                                                            │
│ │  4. authLimiter (10 req/15min)                             │
│ │     ✓ Check rate limit by IP (from X-Forwarded-For)       │
│ │                                                            │
│ │  5. validate(authLoginSchema, 'body')                      │
│ │     ✓ Email format validation                             │
│ │     ✓ Password complexity validation                       │
│ │     ✗ Return 422 if invalid                               │
│ │                                                            │
│ ├─ ROUTE HANDLER: auth.controller.loginUser()               │
│ │  ├─ Input: { email, password }                            │
│ │  └─ Business Logic:                                       │
│ │     1. Query database for user by email                    │
│ │        SELECT * FROM users WHERE lower(email) = $1        │
│ │        ↓ (Database request travels via backend-net)        │
│ └─ (continues →)
```

### Database Query Flow

```
API QUERIES DATABASE:

┌──────────────────────────────────────────────────────────────┐
│ API (172.20.0.3)                                             │
│ Calls: db.userDb.getUserByEmail(email)                       │
│ ├─ Constructs parameterized query:                           │
│ │  "SELECT * FROM users WHERE lower(email) = $1"            │
│ │  Parameters: [email]                                       │
│ │  ✓ SQL injection protected                                 │
│ │                                                            │
│ └─ Sends over backend-net TCP:5432                           │
└──────┬────────────────────────────────────────────────────┘
       │
       │  TCP Connection (backend-net only)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ POSTGRESQL (172.21.0.2 - backend-net only)                   │
│ ├─ Receives query                                            │
│ ├─ Executes: SELECT * FROM users WHERE lower(email) = $1    │
│ ├─ Database hit: Email indexed (unique, lowercase)           │
│ ├─ Returns result set:                                       │
│ │  {                                                         │
│ │   user_id: 1,                                              │
│ │   email: "user@example.com",                               │
│ │   password: "$2b$12$...",  (bcrypt hash)                   │
│ │   fullname: "John Doe",                                    │
│ │   role: "user",                                            │
│ │   is_mfa_enabled: false,                                   │
│ │   ...                                                      │
│ │  }                                                         │
│ │                                                            │
│ └─ Returns over backend-net TCP:5432                         │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ API (continues auth.controller.loginUser())                  │
│ ├─ Receives user object from DB                              │
│ ├─ Verify password:                                          │
│ │  1. bcrypt.compare(password, userObject.password)          │
│ │  2. Timing-safe comparison (prevents timing attacks)       │
│ │  3. ✓ Password matches (returns true)                      │
│ │                                                            │
│ ├─ Check MFA enabled: is_mfa_enabled = false                 │
│ │  → Skip MFA flow                                           │
│ │                                                            │
│ ├─ Generate tokens:                                          │
│ │  1. Access Token (RS256):                                  │
│ │     Payload: { id: 1, role: 'user' }                       │
│ │     Expiry: 15 minutes                                     │
│ │     Signed with: PRIVATE_KEY                               │
│ │     = "eyJhbGciOiJSUzI1NiJ9..."                             │
│ │                                                            │
│ │  2. Refresh Token (RS256):                                 │
│ │     Payload: { id: 1, type: 'refresh' }                    │
│ │     Expiry: 7 days                                         │
│ │     Signed with: PRIVATE_KEY                               │
│ │     = "eyJhbGciOiJSUzI1NiJ9..."                             │
│ │                                                            │
│ ├─ Store refresh token hash in DB:                           │
│ │  1. Hash refresh token: SHA-256(refreshToken)              │
│ │  2. Query:                                                 │
│ │     INSERT INTO refresh_tokens                             │
│ │     (user_id, token_hash, expires_at, revoked)             │
│ │     VALUES ($1, $2, $3, false)                             │
│ │                                                            │
│ ├─ Set HttpOnly cookies:                                     │
│ │  Set-Cookie: accessToken=<token>; HttpOnly; Secure;       │
│ │              SameSite=Strict; Max-Age=900                  │
│ │  Set-Cookie: refreshToken=<token>; HttpOnly; Secure;      │
│ │              SameSite=Strict; Max-Age=604800               │
│ │                                                            │
│ └─ Return response: 200 OK                                   │
│    {                                                         │
│     "status": "success",                                     │
│     "user_id": 1,                                            │
│     "email": "user@example.com",                             │
│     "role": "user"                                           │
│    }                                                         │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ NGINX RECEIVES RESPONSE                                      │
│ ├─ Forwards cookies and body to browser                      │
│ ├─ Adds security headers                                     │
│ └─ Returns 200 OK to client                                  │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ BROWSER RECEIVES RESPONSE                                    │
│ ├─ JavaScript automatically stores cookies                   │
│ │  (HttpOnly prevents XSS access, browser manages)           │
│ ├─ React updates UserContext:                                │
│ │  ├─ isLoggedIn = true                                      │
│ │  ├─ userData = { id, email, role }                         │
│ │  └─ Redirects to /account or home                          │
│ │                                                            │
│ └─ Subsequent API calls include cookies automatically        │
│    (Axios configured with credentials: include)             │
└──────────────────────────────────────────────────────────────┘
```

### Protected Endpoint Flow

```
SUBSEQUENT API CALL (with authentication):

User visits /cart (protected page):
  ├─ React checks UserContext: isLoggedIn?
  │  ├─ YES → Render cart page
  │  └─ NO → Redirect to /login
  │
  ├─ Cart.jsx calls cart.service.getCart()
  └─ Makes request to GET /api/cart

REQUEST: HTTP GET /api/cart
Headers:
  Cookie: accessToken=<JWT>; refreshToken=<JWT>
From: Browser
To: Nginx:80

┌──────────────────────────────────────────────────────────────┐
│ NGINX                                                        │
│ ├─ Routes /api/* → upstream: http://api:9000               │
│ ├─ Includes cookie headers in request                        │
│ └─ Forwards to API                                           │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ API MIDDLEWARE STACK                                         │
│                                                              │
│ 1. globalLimiter (100 req/15min) ✓ Pass                     │
│                                                              │
│ 2. validate() middleware - none for this endpoint ✓           │
│                                                              │
│ 3. verifyToken() middleware (JWT Authentication)            │
│    ├─ Extract cookies from request headers                   │
│    ├─ Get accessToken cookie value                           │
│    ├─ Decode JWT:                                            │
│    │  ├─ Extract header: { "alg": "RS256", ... }            │
│    │  ├─ Verify signature using PUBLIC_KEY                  │
│    │  │  (RS256 signature verification with RSA)             │
│    │  ├─ Check expiration (now < exp)                        │
│    │  │  ✓ Token not expired                                 │
│    │  └─ Reject if HS256 (algorithm confusion protection)    │
│    │                                                         │
│    ├─ Extract payload: { id: 1, role: "user" }              │
│    ├─ Populate req.user = { id: 1, role: "user", ... }      │
│    │                                                         │
│    └─ ✓ Continue to route handler                           │
│       (If invalid/expired → 401 Unauthorized)                │
│                                                              │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ROUTE HANDLER: cart.controller.getCart()                    │
│ ├─ Input: req.user.id = 1                                    │
│ │                                                            │
│ ├─ Call: db.cartDb.getUserCart(req.user.id)                 │
│ │  Query:                                                    │
│ │  SELECT ci.*, p.name, p.price, p.slug                      │
│ │  FROM cart_item ci                                         │
│ │  JOIN products p ON ci.product_id = p.product_id           │
│ │  WHERE ci.cart_id = (                                      │
│ │    SELECT id FROM cart WHERE user_id = $1                  │
│ │  )                                                         │
│ │                                                            │
│ │  (Query travels via backend-net to PostgreSQL)             │
│ │                                                            │
│ └─ PostgreSQL returns:                                       │
│    [                                                         │
│     {                                                        │
│      product_id: 5,                                          │
│      name: "Product A",                                      │
│      quantity: 2,                                            │
│      price: 29.99                                            │
│     },                                                       │
│     ...                                                      │
│    ]                                                         │
│                                                              │
│ ├─ Calculate totals in service layer                         │
│ ├─ Return JSON response                                      │
│ │  {                                                         │
│ │   "status": "success",                                     │
│ │   "data": {                                                │
│ │    "items": [...],                                         │
│ │    "total_items": 2,                                       │
│ │    "total_price": 59.98                                    │
│ │   }                                                        │
│ │  }                                                         │
│                                                              │
│ └─ Send 200 OK to client                                     │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ NGINX → Browser                                              │
│ Browser receives JSON response                               │
│ React CartContext updates state                              │
│ Component re-renders with cart items                         │
└──────────────────────────────────────────────────────────────┘
```

---

## SECURITY IMPLEMENTATION

### Authentication Security

#### Password Storage

```
User Password: "MySecurePass123!"

Step 1: Hash with bcrypt
├─ Algorithm: bcrypt
├─ Cost: 12 (computation time: >150ms)
├─ Salt: Random 16 bytes
├─ Output: $2b$12$R9h7cIPz0gi.URNNGUEM2OPST9EybxqhqHucl...

Step 2: Store in database
├─ Table: users
├─ Column: password (VARCHAR 200)
└─ Value: bcrypt hash (never plaintext)

Step 3: Verification on login
├─ Input: user password
├─ Retrieved: bcrypt hash from DB
├─ bcrypt.compare(input, hash)
│  └─ Timing-safe comparison (prevents timing attacks)
└─ Result: true/false
```

#### Token Security

**Access Token (15 minutes):**

```
Type: JWT (RS256)
Payload:
{
  "id": 1,                          /* User ID */
  "role": "user",                   /* 'user' or 'admin' */
  "iat": 1718000000,               /* Issued at */
  "exp": 1718000900               /* Expires (15min) */
}

Signature: RS256(header.payload, PRIVATE_KEY)
- Signed with private RSA key (2048-bit)
- Verified with public RSA key
- Prevents token tampering

Storage: HttpOnly cookie
{
  Name: "accessToken"
  Value: <JWT>
  HttpOnly: true                    /* Prevents XSS JavaScript access */
  Secure: true                      /* HTTPS only */
  SameSite: Strict                  /* Prevents CSRF */
  Max-Age: 900                      /* 15 minutes */
}
```

**Refresh Token (7 days):**

```
Type: JWT (RS256) + Database Validation
Database Storage: refresh_tokens table
{
  id: serial
  user_id: 1
  token_hash: SHA-256(refreshToken)  /* Hashed before storage */
  expires_at: timestamp               /* 7 days from now */
  revoked: false                      /* Revocation flag */
  created_at: timestamp               /* Audit timestamp */
}

Refresh Flow:
1. Client sends refreshToken cookie
2. API extracts token and hashes it
3. Query DB: SELECT * FROM refresh_tokens WHERE token_hash = $1
4. Verify not revoked and not expired
5. Issue new accessToken
6. Optionally rotate refreshToken

Logout: SET revoked = true in DB (immediate revocation)
```

#### MFA (TOTP) Security

```
Setup Flow:
1. User requests MFA setup
2. Server generates secret using speakeasy library:
   ├─ Secret: 32-byte random (base32 encoded)
   ├─ Algorithm: HMAC-SHA1
   ├─ Time Step: 30 seconds
   └─ Digits: 6 digits

3. Encryption before storage:
   ├─ Algorithm: AES-256-GCM
   ├─ Key: MFA_ENCRYPTION_KEY (32 bytes from env)
   ├─ IV: 12-byte random per encryption
   ├─ Plaintext: secret
   ├─ Output: ciphertext + IV + authenticationTag
   │
   └─ Database storage:
      {
        mfa_secret_enc: <ciphertext>,
        mfa_secret_iv: <IV>,
        mfa_secret_tag: <auth_tag>,
        is_mfa_enabled: false  (not enabled until verified)
      }

4. QR Code generation:
   ├─ Format: otpauth://totp/user@domain?secret=...&issuer=Vantage
   ├─ User scans with TOTP app (Google Authenticator, Authy, etc.)
   └─ User's app derives same 6-digit codes

Verification Flow:
1. User enters 6-digit code from TOTP app
2. Server decrypts MFA secret:
   ├─ Ciphertext + IV + AuthTag → speakeasy.decrypt()
   └─ Returns plaintext secret

3. Server verifies code:
   ├─ speakeasy.totp.verify({
   │    secret: plaintext_secret,
   │    encoding: 'base32',
   │    window: 1  /* Allow ±1 time window for clock skew */
   │  })
   └─ Returns true/false

4. If valid:
   ├─ Set is_mfa_enabled = true
   └─ Store backup codes (optional)

Login with MFA:
1. User enters email + password
2. Password verified successfully
3. Check is_mfa_enabled = true
4. Return { mfa_required: true, mfa_token: JWT }
   (mfa_token is short-lived, allows only /auth/login/mfa endpoint)
5. User enters 6-digit code
6. POST /auth/login/mfa with mfa_token + code
7. Verify TOTP code
8. Issue accessToken + refreshToken
```

### Input Validation Security

```
Server-Side Validation (Joi Schemas):

1. Login Endpoint
   Schema:
   {
     email: Joi.string().email().lowercase().required(),
     password: Joi.string().min(8).required()
   }

2. Signup Endpoint
   Schema:
   {
     email: Joi.string().email().lowercase().required(),
     password: Joi.string()
       .min(8)
       .regex(/[A-Z]/)           /* At least 1 uppercase */
       .regex(/[a-z]/)           /* At least 1 lowercase */
       .regex(/[0-9]/)           /* At least 1 digit */
       .regex(/[!@#$%^&*]/)       /* At least 1 special char */
       .required(),
     username: Joi.string()
       .alphanum()
       .min(3)
       .max(30)
       .lowercase()
       .required(),
     fullname: Joi.string().min(2).max(100).required()
   }

3. Create Product Endpoint (Admin)
   Schema:
   {
     name: Joi.string().max(100).required(),
     price: Joi.number().positive().required(),
     description: Joi.string().required(),
     image_url: Joi.string().uri().optional()
   }

Benefits:
- Type checking (string, number, boolean)
- Format validation (email, URI, alphanum)
- Length constraints (min, max)
- Pattern matching (regex)
- Sanitization (lowercase, strip unknown fields)
- Custom error messages (user-friendly)
- Returns 422 Unprocessable Entity on validation failure
```

### SQL Injection Protection

```
VULNERABLE CODE (DO NOT USE):
GET /products?search=Apple' OR '1'='1
├─ Query: "SELECT * FROM products WHERE name LIKE '%" + search + "%'"
├─ Result: "SELECT * FROM products WHERE name LIKE '%Apple' OR '1'='1%'"
└─ Consequence: Returns all products (data breach!)

SECURE CODE (Parameterized Queries):
GET /products?search=Apple' OR '1'='1
├─ Query: "SELECT * FROM products WHERE name LIKE $1"
├─ Parameters: ['%' + search + '%']  (separate from query)
├─ PostgreSQL client:
│  └─ Escapes special characters automatically
├─ Result: "SELECT * FROM products WHERE name LIKE '%Apple\' OR \'1\'=\'1%'"
└─ Consequence: Returns only products matching "Apple' OR '1'='1" (no match)

All database queries use parameterized queries:
db.query("SELECT * FROM users WHERE email = $1", [email])
db.query("INSERT INTO orders (...) VALUES ($1, $2, $3)", [userId, amount, status])
db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId])

Parameters ($1, $2, etc.) are bound separately, preventing injection.
```

### Cross-Site Scripting (XSS) Protection

```
1. HttpOnly Cookies (JWT tokens)
   ├─ Tokens stored in HttpOnly cookies
   ├─ JavaScript cannot access (document.cookie blocked)
   └─ Prevents XSS theft of authentication credentials

2. Content Security Policy (CSP)
   Headers sent by API:
   {
     "default-src": ["'self'"],                    /* Only same-origin */
     "script-src": [
       "'self'",
       "https://checkout.razorpay.com",          /* Whitelist payment provider */
       "https://accounts.google.com/gsi/client"  /* Whitelist OAuth provider */
     ],
     "style-src": ["'self'", "'unsafe-inline'"],  /* Allow inline styles */
     "img-src": ["'self'", "data:", "https:"],    /* Allow images */
     "font-src": ["'self'"],
     "object-src": ["'none'"]                      /* Prevent plugins */
   }

   Effect:
   ├─ Inline <script> tags blocked (except whitelisted domains)
   ├─ Eval() blocked
   ├─ External scripts only from whitelisted origins
   └─ Prevents attacker-injected scripts from executing

3. React's JSX Escaping
   ├─ React automatically escapes interpolated values
   └─ Example:
      const userInput = "<img src=x onerror='alert(1)'>";
      return <div>{userInput}</div>;  /* Displays as text, not HTML */

4. Input Sanitization
   ├─ All user inputs validated server-side
   ├─ Unexpected fields stripped (Joi)
   └─ HTML/JavaScript sequences rejected
```

### Rate Limiting Security

```
Global Rate Limiter:
├─ Limit: 100 requests per 15 minutes
├─ Per: IP address
├─ Key: X-Forwarded-For header (from Nginx)
└─ Response: 429 Too Many Requests

Auth Rate Limiter:
├─ Endpoints: /api/auth/login, /api/auth/signup
├─ Limit: 10 requests per 15 minutes
├─ Per: IP address
└─ Purpose: Brute-force attack prevention

Nginx Rate Limiting:
├─ General endpoints: 10 requests/second
├─ Auth endpoints: 2 requests/second
├─ API endpoints: 5 requests/second
└─ Zone: Per IP address

Combined Effect:
├─ Distributed rate limiting (Nginx + Express)
├─ Short-term: Nginx (per-second buckets)
├─ Long-term: Express (per-minute/per-15-min)
├─ Brute-force attempt: 5 failed logins (10/15min) = 1 hour to try 10 combinations
└─ Fails fail2ban rule: 1-hour IP ban
```

### CSRF Protection

```
1. SameSite Cookies
   ├─ Attribute: SameSite=Strict
   ├─ Effect: Cookies NOT sent for cross-origin requests
   └─ Prevents: CSRF attacks (malicious site can't send authenticated requests)

2. CORS Validation
   ├─ Whitelist origins in ALLOWED_ORIGINS env
   ├─ Request from different origin is rejected
   └─ Prevents: Cross-origin API calls from unauthorized sites

3. Preflight Requests
   ├─ Browser sends OPTIONS request before POST/PUT/DELETE
   ├─ API responds with CORS headers (or 403)
   └─ Prevents: Simple malicious requests
```

### Security Headers

```
Helmet.js provides:

1. Content-Security-Policy (CSP)
   └─ Restrict resource origins

2. X-Frame-Options: deny
   └─ Prevent clickjacking (framing in <iframe>)

3. X-Content-Type-Options: nosniff
   └─ Prevent MIME sniffing

4. Strict-Transport-Security (HSTS)
   └─ max-age: 31536000 (1 year)
   └─ Force HTTPS for 1 year

5. Referrer-Policy: strict-origin-when-cross-origin
   └─ Don't leak referrer to external sites

6. X-XSS-Protection
   └─ Enable browser XSS protections

7. Permissions-Policy
   └─ Restrict sensitive features (camera, microphone, etc.)
```

---

## DEPLOYMENT STRATEGY

### Pre-Deployment Checklist

```
☐ Environment Variables
  ├─ NODE_ENV=production
  ├─ JWT keys (PRIVATE_KEY, PUBLIC_KEY)
  ├─ Database credentials (POSTGRES_USER, POSTGRES_PASSWORD)
  ├─ MFA_ENCRYPTION_KEY (base64-encoded 32 bytes)
  ├─ RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
  ├─ SMTP credentials (email sending)
  ├─ ALLOWED_ORIGINS (comma-separated domains)
  └─ All stored in AWS Secrets Manager or HashiCorp Vault

☐ SSL/TLS Certificates
  ├─ Let's Encrypt certificate (auto-renewable)
  ├─ Private key permissions: 0o600
  └─ Validity: Check 30 days before expiry

☐ Database
  ├─ PostgreSQL 16 installed and running
  ├─ Backup strategy configured
  ├─ Connection pooling configured
  └─ Query logging enabled (audit trail)

☐ Docker
  ├─ Docker Engine 20.10+ installed
  ├─ Docker Compose 2.0+ installed
  ├─ Container registry credentials configured
  └─ Images built and tested locally

☐ Firewall & Network
  ├─ UFW configured (SSH, HTTP, HTTPS only)
  ├─ Security groups configured (AWS)
  ├─ Network interfaces isolated (frontend-net, backend-net)
  └─ No direct database access from internet

☐ Host Hardening
  ├─ SSH key-based authentication (disable password)
  ├─ Fail2Ban configured and active
  ├─ Unattended upgrades enabled
  ├─ Audit logging enabled
  └─ System packages updated

☐ Monitoring & Logging
  ├─ CloudWatch/DataDog agent installed
  ├─ Log aggregation configured
  ├─ Metrics collection enabled
  ├─ Alerts configured (high CPU, high memory, errors)
  └─ Error tracking (Sentry optional)

☐ Application
  ├─ All tests passing (npm test)
  ├─ SBOM generated (software bill of materials)
  ├─ Security scan passed (OWASP ZAP)
  ├─ Performance tested (load test)
  └─ Documentation updated
```

### Host Hardening (Step-by-Step)

#### 1. SSH Hardening

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Key settings:
PermitRootLogin no                  # Disable root login
PasswordAuthentication no             # Key-based auth only
PubkeyAuthentication yes              # Enable SSH keys
X11Forwarding no                      # Disable X11
AllowTcpForwarding no                 # Disable TCP forwarding
MaxAuthTries 3                        # Limit retry attempts
Protocol 2                            # SSH v2 only
Port 22                               # Change to non-standard (optional)

# Restart SSH
sudo systemctl restart ssh

# Verify key-based access works before closing terminal!
```

#### 2. UFW Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (critical!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Set default policy
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Verify rules
sudo ufw status verbose

# Example output:
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
# 22/tcp (v6)                ALLOW       Anywhere (v6)
# 80/tcp (v6)                ALLOW       Anywhere (v6)
# 443/tcp (v6)               ALLOW       Anywhere (v6)
```

#### 3. Fail2Ban Configuration

```bash
# Install
sudo apt install fail2ban

# Create local configuration
sudo nano /etc/fail2ban/jail.local

# Content:
[DEFAULT]
bantime = 3600          # Ban for 1 hour
findtime = 600          # Check last 10 minutes
maxretry = 5            # Ban after 5 attempts

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3            # Ban after 3 SSH attempts
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

#### 4. Unattended Upgrades

```bash
# Install
sudo apt install unattended-upgrades

# Configure
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Enable automatic reboot (optional)
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Reboot "1";
APT::Periodic::Reboot-Time "03:00";  # Reboot at 3 AM UTC

# Enable service
sudo systemctl enable unattended-upgrades
```

### Docker Deployment

#### 1. Build and Push Images

```bash
# Build API image
docker-compose build api

# Build Nginx image (or use pre-built client)
docker build -t pern-store-nginx -f client/Dockerfile client/

# Tag for registry
docker tag pern-store-api-prod your-registry.azurecr.io/pern-store-api:latest
docker tag pern-store-nginx your-registry.azurecr.io/pern-store-nginx:latest

# Push to registry
docker push your-registry.azurecr.io/pern-store-api:latest
docker push your-registry.azurecr.io/pern-store-nginx:latest
```

#### 2. Deploy Production Stack

```bash
# Create .env file with production secrets
cat > server/.env << EOF
NODE_ENV=production
PORT=9000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=pernstore
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
MFA_ENCRYPTION_KEY=$(openssl rand -base64 32)

RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

LOG_LEVEL=info
EOF

# Ensure .env is secure
chmod 600 server/.env

# Start containers
docker-compose -f docker-compose.yml up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f nginx
```

#### 3. Enable HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (auto-configures Nginx)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (certbot handles this)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

#### 4. Database Backup Strategy

```bash
# Automatic daily backups
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec pern-prod-db pg_dump \
  -U postgres \
  -d pernstore \
  > "$BACKUP_DIR/pernstore_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/pernstore_$DATE.sql"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/pernstore_$DATE.sql.gz"
EOF

chmod +x /home/ubuntu/backup-db.sh

# Schedule with crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh") | crontab -

# Verify backup
crontab -l | grep backup-db.sh
```

### Production Monitoring

```
Metrics to Monitor:

1. Application Metrics
   ├─ Request rate (req/s)
   ├─ Response time (p50, p95, p99)
   ├─ Error rate (5xx, 4xx)
   ├─ JWT validation failures
   ├─ Rate limit triggers
   └─ Database query time

2. System Metrics
   ├─ CPU usage (should be < 70%)
   ├─ Memory usage (should be < 80%)
   ├─ Disk usage (should be < 80%)
   ├─ Network I/O
   └─ Container restart count

3. Database Metrics
   ├─ Connection pool utilization
   ├─ Query duration
   ├─ Slow queries (>100ms)
   ├─ Index hit rate
   └─ Data volume growth

4. Security Metrics
   ├─ Failed login attempts
   ├─ MFA verification success rate
   ├─ SQL injection attempts (blocked)
   ├─ CORS rejections
   └─ Rate limit blocks

Alerting Rules:
├─ Error rate > 5% for 5 minutes
├─ Response time p95 > 1 second
├─ CPU usage > 80% for 10 minutes
├─ Memory usage > 85% sustained
├─ Disk usage > 90%
├─ Database connection pool > 90% utilized
├─ Failed logins > 10 per minute (same IP)
└─ Container restarted > 5 times in 1 hour
```

---

## PERFORMANCE & SCALABILITY

### Optimization Strategies

#### Frontend

```
1. Code Splitting
   ├─ Route-based code splitting with React.lazy()
   └─ Load chunks on-demand, not all upfront

2. Image Optimization
   ├─ WebP format (modern browsers)
   ├─ Responsive images (srcset)
   └─ Lazy loading (intersection observer)

3. CSS Optimization
   ├─ Tailwind CSS tree-shaking
   ├─ PostCSS minification
   ├─ Critical CSS inlined

4. Bundle Analysis
   ├─ Vite rollup analyzer
   └─ Identify large dependencies

5. Caching Strategy
   ├─ Service Worker for offline support
   ├─ Browser cache (max-age headers)
   └─ CDN cache for static assets
```

#### Backend

```
1. Database Indexing
   ├─ Email, username (unique indexes)
   ├─ Foreign keys (join optimization)
   ├─ Query-specific indexes (.e.g product_id in cart_item)
   └─ Regular ANALYZE for statistics

2. Connection Pooling
   ├─ pg pool: 10-20 connections
   ├─ Max connections on DB: 100
   ├─ Idle timeout: 30 seconds
   └─ Reuse connections across requests

3. Query Optimization
   ├─ Avoid N+1 queries (use JOINs)
   ├─ Pagination (LIMIT/OFFSET)
   ├─ Select only needed columns
   └─ Monitor slow queries (EXPLAIN ANALYZE)

4. Caching Layer (Optional)
   ├─ Redis for session storage
   ├─ Cache product list (invalidate on update)
   ├─ Cache user profile (TTL: 1 hour)
   └─ Cache reviews (TTL: 30 minutes)

5. Asynchronous Processing
   ├─ Email sending (background job)
   ├─ Report generation (queue)
   └─ Webhook processing (event-driven)
```

#### Infrastructure

```
1. Horizontal Scaling
   ├─ Run multiple API containers (Docker Swarm / Kubernetes)
   ├─ Load balance with Nginx
   ├─ Shared PostgreSQL backend
   └─ Sticky sessions for stateful clients (if needed)

2. CDN Integration
   ├─ CloudFront / Cloudflare for static assets
   ├─ Gzip compression
   ├─ Geographic distribution
   └─ Cache busting with versioned filenames

3. Database Scaling
   ├─ Read replicas for reporting/analytics
   ├─ Replication lag monitoring
   ├─ Connection routing to read replicas
   └─ Promote replica on primary failure

4. Auto-Scaling
   ├─ Container orchestration (Kubernetes)
   ├─ Scale based on CPU/memory
   ├─ Scale based on request rate
   └─ Minimum 2 replicas for HA
```

---

## MONITORING & LOGGING

### Logging Strategy

```
Log Levels:
├─ INFO: Normal operations (logins, API calls)
├─ WARN: Potential issues (rate limit approaching)
├─ ERROR: Failures (database query error, validation failed)
└─ DEBUG: Detailed info (variable values, query strings) — disabled in production

Log Format (JSON):
{
  "timestamp": "2024-06-04T10:30:45.123Z",
  "level": "info",
  "service": "api",
  "event": "LOGIN_SUCCESS",
  "userId": 42,
  "email": "user@example.com",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "path": "/api/auth/login",
  "method": "POST",
  "statusCode": 200,
  "responseTime": 245,
  "environment": "production"
}

Critical Events Logged:
├─ SIGNUP_SUCCESS / SIGNUP_FAILURE
├─ LOGIN_SUCCESS / LOGIN_FAILURE / LOGIN_MFA_REQUIRED
├─ LOGOUT_SUCCESS / LOGOUT_FAILURE
├─ TOKEN_REFRESH_SUCCESS / TOKEN_REFRESH_FAILURE
├─ AUTH_FAILURE (invalid/expired token)
├─ RBAC_FAILURE (insufficient permissions)
├─ PAYMENT_VERIFICATION_SUCCESS / PAYMENT_VERIFICATION_FAILURE
├─ RATE_LIMIT_EXCEEDED
├─ VALIDATION_FAILURE
├─ DATABASE_ERROR
├─ EXTERNAL_API_ERROR
└─ SECURITY_ALERT (MFA bypass attempt, injection attempt)

Log Retention:
├─ Daily rotation
├─ Max 10MB per file
├─ Retain 30 days locally
├─ Archive to S3 after 7 days
├─ Compress archives (gzip)
└─ Delete after 90 days
```

### Audit Trail

```
Audit Log Table (optional):
{
  id: serial
  timestamp: timestamp
  event_type: string
  user_id: integer
  resource_type: string  (e.g., 'user', 'product', 'order')
  resource_id: integer
  action: string  (e.g., 'CREATE', 'UPDATE', 'DELETE')
  old_values: jsonb  (what changed)
  new_values: jsonb  (new state)
  ip_address: inet
  user_agent: text
}

Critical Audited Events:
├─ User account creation/deletion
├─ Password changes
├─ MFA enable/disable
├─ Product creation/deletion/modification
├─ Order creation/cancellation
├─ Payment processing
├─ Admin actions (role changes, user deletion)
└─ Sensitive data access
```

---

## TROUBLESHOOTING & SUPPORT

### Common Issues

#### Issue: 401 Unauthorized on Protected Routes

```
Symptoms:
- User logged in but still getting 401
- Can access public pages only

Possible Causes:
1. Access token expired
   └─ Solution: Check token expiration time, refresh token

2. Token not in cookie
   └─ Solution: Check HttpOnly cookie is being sent
   └─ Verify CORS credentials: include

3. Invalid JWT signature
   └─ Solution: Verify PRIVATE_KEY/PUBLIC_KEY match

4. Wrong token algorithm
   └─ Solution: Check token is RS256 (not HS256)

Debugging:
├─ browser DevTools → Network → Check Cookie header
├─ Check API response status code and message
├─ Server logs: Check JWT verification error
└─ Verify .env variables loaded correctly
```

#### Issue: Database Connection Timeout

```
Symptoms:
- Requests hanging for 30+ seconds
- Docker container logs: "connect ECONNREFUSED"

Possible Causes:
1. PostgreSQL not running
   └─ Solution: docker-compose restart postgres

2. Connection pool exhausted
   └─ Solution: Increase max_connections in PostgreSQL

3. Firewall blocking port 5432
   └─ Solution: Check docker networks connectivity

4. Network bridge misconfigured
   └─ Solution: Verify API on both frontend-net and backend-net

Debugging:
├─ docker-compose ps  (verify postgres is running)
├─ docker-compose logs postgres  (check startup errors)
├─ docker exec pern-prod-db psql -U postgres -c "SELECT version();"
└─ Verify POSTGRES_HOST=postgres in API .env
```

#### Issue: CORS Error in Browser

```
Symptoms:
- Browser console: "Access to XMLHttpRequest blocked by CORS policy"
- API works in Postman but not in browser

Possible Causes:
1. Origin not in ALLOWED_ORIGINS
   └─ Solution: Add origin to .env

2. Missing credentials in Axios config
   └─ Solution: Ensure withCredentials: true

3. Preflight request rejected
   └─ Solution: Check CORS middleware is configured

Debugging:
├─ browser DevTools → Network → Check OPTIONS request
├─ Check response headers: Access-Control-Allow-Origin
├─ Verify .env ALLOWED_ORIGINS includes browser origin
└─ Check API logs for CORS errors
```

---

## CONCLUSION

This Vantage e-commerce application represents a production-ready PERN stack with:

✅ **Secure Architecture**: Defense-in-depth with network segmentation  
✅ **Scalable Design**: Containerized, horizontally scalable infrastructure  
✅ **Authentication**: RS256 JWT + MFA + OAuth2 support  
✅ **Data Protection**: Encrypted at rest, in transit, and access-controlled  
✅ **Performance**: Optimized queries, caching, and compression  
✅ **Monitoring**: Comprehensive logging and audit trails  
✅ **Compliance**: SBOM, VEX analysis, security scanning

**Key Takeaways for Interview/Presentation:**

1. **Architecture**: Three-tier with DMZ-based network isolation
2. **Security**: Zero-trust, defense-in-depth, encryption-first
3. **Scalability**: Containerized, load-balanced, database replication ready
4. **DevOps**: Infrastructure as Code (Docker Compose), automated deployment
5. **Operations**: Health checks, monitoring, logging, automated backups

---

**Document Author**: Security Architecture Team  
**Last Updated**: June 2024  
**Classification**: Internal Use
