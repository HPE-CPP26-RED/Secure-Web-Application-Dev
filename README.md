# Vantage

[![Tech Stack](https://img.shields.io/badge/Stack-PERN-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Security Audit](https://img.shields.io/badge/Security-Verified-success.svg)](security/vex/vex-analysis.md)

Vantage is a high-performance, enterprise-grade e-commerce application built using the **PERN** (PostgreSQL, Express, React, Node.js) stack. Designed with a security-first mindset, Vantage features an isolated, containerized database, a secure reverse proxy configuration, and robust, verified payment gateway processing via Razorpay.

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Windmill UI, Axios |
| **Backend** | Node.js, Express, JWT, Bcrypt, Joi/Zod |
| **Database** | PostgreSQL 16 |
| **Infrastructure** | Nginx, Docker, Docker Compose |
| **Payments** | Razorpay SDK |
| **Security** | CycloneDX (SBOM), VEX, Fail2Ban, UFW |

---

## High-Level System Architecture

Vantage employs a multi-tier deployment topology to ensure strict separation of concerns and maximum security. The system is orchestrated via Docker with a focus on network segmentation (the "Zone Model").

### 4-Layer Topology

1.  **Presentation Layer (React & Vite)**:
    *   Responsive UI bundled with Vite.
    *   Styled using **Tailwind CSS** and **Windmill UI** for a premium, accessible user experience.
2.  **Routing & Gateway Layer (Nginx)**:
    *   Acts as a secure reverse proxy and API Gateway.
    *   Terminates SSL/TLS, hides backend server headers, and routes traffic to eliminate CORS issues.
3.  **Application Layer (Node.js & Express)**:
    *   RESTful API handling business logic, authentication, and transactional flows.
    *   Uses structured middleware for RBAC and input validation.
4.  **Data Layer (PostgreSQL)**:
    *   Isolated within a private Docker bridge network (`backend-net`).
    *   Unreachable from the host loopback or the public internet, accessible only by the Application Layer.

### System Deployment Diagram

```mermaid
graph TB
    Internet((Public Internet)) 
    
    subgraph Docker_Host ["Docker Infrastructure Host"]
        direction TB
        
        subgraph Frontend_Net ["Network: frontend-net (Bridge)"]
            direction LR
            Nginx_Cont["Container: Nginx Proxy"]
            API_Cont["Container: Node.js API"]
        end
        
        subgraph Backend_Net ["Network: backend-net (Isolated)"]
            direction LR
            DB_Cont[("Container: PostgreSQL")]
        end
    end
    
    Internet -->|HTTP/S: 80, 443| Nginx_Cont
    Nginx_Cont -->|Proxy Traffic| API_Cont
    API_Cont -->|Parameterized SQL| DB_Cont
    
    %% Styling
    style Docker_Host fill:#f0f7ff,stroke:#0056b3,stroke-width:3px,stroke-dasharray: 5 5
    style Frontend_Net fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Backend_Net fill:#fff9c4,stroke:#fbc02d,stroke-width:2px
    
    style Internet fill:#eceff1,stroke:#37474f,stroke-width:2px
    style Nginx_Cont fill:#01A982,color:#fff,stroke:#00695c,stroke-width:2px
    style API_Cont fill:#121212,color:#fff,stroke:#000,stroke-width:2px
    style DB_Cont fill:#0073e6,color:#fff,stroke:#0d47a1,stroke-width:2px
```

### Network Segmentation (Zone Model)

| Zone | Service | Network | External Access |
| :--- | :--- | :--- | :--- |
| **Web Zone (DMZ)** | Nginx | `frontend-net` | Port 80/443 |
| **App Zone** | API Server | `frontend-net`, `backend-net` | None (Internal Only) |
| **Data Zone** | PostgreSQL | `backend-net` | None (Isolated) |

---

## Database Schema & Relational Dictionary

The following catalog defines the relational structure and transactional integrity constraints of the Vantage platform.

## Database Schema Relationship

The following Entity Relationship (ER) diagram illustrates the relational structure and transactional integrity constraints of the Vantage platform.

```mermaid
erDiagram
    users {
        int user_id PK
        string email UK
        string username UK
        string role
    }
    products {
        int product_id PK
        string slug UK
        string name
        float price
    }
    orders {
        int order_id PK
        int user_id FK
        string status
        float amount
    }
    order_item {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    cart {
        int id PK
        int user_id FK
    }
    cart_item {
        int id PK
        int cart_id FK
        int product_id FK
        int quantity
    }
    reviews {
        int user_id FK
        int product_id FK
        string content
        int rating
    }

    users ||--o{ orders : "places"
    users ||--o| cart : "owns"
    users ||--o{ reviews : "writes"
    orders ||--|{ order_item : "contains"
    products ||--o{ order_item : "included_in"
    products ||--o{ cart_item : "added_to"
    products ||--o{ reviews : "rated_in"
    cart ||--|{ cart_item : "holds"
```

---

## Security & Hardening Architecture

Vantage is built on a "Defense in Depth" philosophy, implementing multiple layers of security from the host level to the application code.

### Host & Infrastructure Hardening
*   **Firewall Isolation**: UFW (Uncomplicated Firewall) strictly configured to allow only essential traffic (SSH, HTTP, HTTPS).
*   **Intrusion Prevention**: Fail2Ban monitoring system logs for brute-force attempts and automatically banning malicious IPs.
*   **SSH Hardening**: Disabled root login, enforced key-based authentication, and custom port configuration.
*   **Docker Security**: 
    *   Containers run with `no-new-privileges:true`.
    *   Read-only root filesystems where possible.
    *   Dedicated bridge networks to prevent lateral movement.

### Supply Chain Security
*   **SBOM (Software Bill of Materials)**: Full CycloneDX SBOMs generated for all services, enabling transparent tracking of third-party dependencies.
*   **VEX (Vulnerability Exploitability eXchange)**: Formal VEX analysis documents the exploitability of detected vulnerabilities, guiding the migration to hardened runtimes (e.g., `node:20-alpine`).

### Application Security
*   **Dual-Flow Authentication**: Secure password hashing via Bcrypt alongside Google OAuth 2.0 for frictionless sign-in.
*   **RBAC (Role-Based Access Control)**: Strictly enforced string roles (`user` or `admin`) validated within JWT payloads.
*   **Route Guards**: Backend-level authorization gates (`verifyToken`, `verifyAdmin`) that cannot be bypassed by client-side manipulation.
*   **SQL Injection Prevention**: 100% usage of Parameterized SQL queries via the `pg` library.
*   **Input Sanitization**: Joi/Zod-based schema validation to reject malformed payloads at the API threshold.

---

## Setup & Local Run Instructions

### Prerequisites
Before running Vantage, ensure your environment meets the following requirements:
*   **Operating System**: Linux (Ubuntu 22.04+ recommended) or **Windows with WSL2**.
*   **Containerization**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Docker Compose installed.
*   **Hardware**: Minimum 4GB RAM and 10GB free disk space.

### Environment Configuration
You must create `.env` files in both the `client` and `server` directories.

#### Server (`server/.env`)
```env
PORT=9000
DATABASE_URL=postgresql://user:pass@postgres:5432/vantage
JWT_SECRET=your_long_secure_secret
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
OAUTH_CLIENT_ID=your_google_client_id
OAUTH_CLIENT_SECRET=your_google_client_secret
```

#### Client (`client/.env`)
```env
VITE_API_URL=http://localhost/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id # Must match OAUTH_CLIENT_ID
VITE_RAZORPAY_KEY_ID=your_key_id
```

### Running with Docker
To build and start the production environment:
```bash
docker-compose -f docker-compose.prod.yml up --build
```

---

## Troubleshooting

### Frontend cannot connect to Backend
**Symptoms**: "Network Error" in browser console, products not loading, login fails.
*   **Check VITE_API_URL**: Ensure `client/.env` has the correct `VITE_API_URL`. If running via Nginx, it should usually point to the domain or `/api`.
*   **Check Container Status**: Run `docker ps` to ensure the `pern-prod-api` container is running.
*   **Check Logs**: Run `docker logs pern-prod-api` to see if the server started correctly.

### Server cannot connect to Database
**Symptoms**: Backend logs show `ECONNREFUSED` or `Authentication failed for user`.
*   **Check Database URL**: Ensure the `DATABASE_URL` or connection parameters in `server/.env` match the credentials in the `postgres` service.
*   **Internal Networking**: Within Docker, the host should be the service name (e.g., `postgres` or `pern-prod-db`), not `localhost`.
*   **Wait for Initialization**: On first run, the database takes a few seconds to initialize from `init.sql`. Check logs with `docker logs pern-prod-db`.

### Google OAuth Flow Fails
**Symptoms**: 500 Error on callback or "Invalid Client ID".
*   **Client ID Match**: Ensure `VITE_GOOGLE_CLIENT_ID` (client) and `OAUTH_CLIENT_ID` (server) are identical.
*   **Authorized Redirect URIs**: Ensure your Google Cloud Console has `http://localhost/api/auth/google/callback` (or your domain) added.

---

## Contributors
Authored and maintained by **[@AravindKamath](https://github.com/AravindKamath)**.

---

Vantage © 2026. High-Performance E-Commerce.
