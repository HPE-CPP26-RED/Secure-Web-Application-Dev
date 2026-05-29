# Testing Progress & Roadmap (May 30, 2026)

## ✅ Completed Testing

- ✅ **API Endpoint Testing** - All endpoints tested and working
- ✅ **Website/Frontend Testing** - UI/UX validated in browser
- ✅ **Manual Testing** - Core workflows verified (signup, login, checkout, etc.)
- ✅ **Docker Environment Setup** - Development containers configured

---

## 📋 Remaining Testing Phases

### Phase 4: Security Testing (SAST/DAST) - **PRIORITY NEXT**

**Tools:** Kali Linux, OWASP ZAP, SQLMap, Burp Suite
**Duration:** 3-5 days
**Why Critical:** MUST complete before AWS production deployment

#### 4.1 - Setup Kali Linux VM

```bash
# Requirements:
# - VirtualBox or VMware
# - 4GB RAM minimum
# - 30GB disk space
# - Network bridge to host machine
```

#### 4.2 - OWASP ZAP Security Scan

```bash
# Start your API server
cd server && npm start

# From Kali Linux, run:
zaproxy -cmd -quickurl http://YOUR_MACHINE_IP:9000/api -quickout report.html
```

**Test Coverage:**

- SQL Injection vulnerabilities
- XSS (Cross-Site Scripting) attacks
- CSRF protection
- Authentication bypass attempts
- Authorization flaws (RBAC testing)
- Sensitive data exposure

#### 4.3 - SQLMap Testing

```bash
# Test all API endpoints for SQL injection
sqlmap -u "http://YOUR_MACHINE_IP:9000/api/users" \
  --data="username=test&email=test@test.com" \
  --batch
```

**Endpoints to Test:**

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/users/:id
- GET /api/products
- POST /api/orders
- POST /api/cart

#### 4.4 - Burp Suite Manual Testing

- Intercept requests/responses
- Test password strength validation
- Verify HttpOnly cookie flags
- Check JWT token expiration
- Test rate limiting (rateLimiter.js middleware)
- Validate input validation (Joi schemas)

#### 4.5 - Manual Penetration Testing Checklist

**Authentication Tests:**

- [ ] Weak password acceptance (< 8 chars) - Should REJECT
- [ ] Duplicate email/username signup - Should REJECT with 409
- [ ] Invalid email format - Should REJECT
- [ ] Login with wrong password - Should REJECT with 401
- [ ] Session token expiration - Should require re-login
- [ ] HttpOnly cookie flag - Verify no JavaScript access

**Authorization Tests (RBAC):**

- [ ] Admin can create users - Should SUCCEED (200)
- [ ] Customer can't create users - Should FAIL (403)
- [ ] User can update own profile - Should SUCCEED (200)
- [ ] User can't update others' profiles - Should FAIL (403)
- [ ] Admin can delete any user - Should SUCCEED (200)
- [ ] Customer can't delete users - Should FAIL (403)

**API Security Tests:**

- [ ] Rate limiting works - 5+ requests in 15 min should throttle
- [ ] Helmet headers present - X-Content-Type-Options, etc.
- [ ] CORS properly configured - Only allowed origins
- [ ] SQL injection attempts - Parameterized queries prevent injection
- [ ] XSS attempts in input fields - Sanitized/escaped

**Data Exposure Tests:**

- [ ] Passwords hashed (bcrypt) - Never stored as plaintext
- [ ] JWT secret not exposed - Check response headers
- [ ] Sensitive info not logged - API keys, passwords not in logs
- [ ] Database credentials not in repo - Only in .env

---

### Phase 5: Docker Security Scanning

**Duration:** 1-2 hours
**Priority:** Before AWS deployment

```bash
# Install Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image pern-store-api-prod

# Check for:
# - CVE vulnerabilities in base image
# - Outdated dependencies
# - Security misconfigurations
```

**Expected Output:**

- List of vulnerabilities by severity (CRITICAL, HIGH, MEDIUM, LOW)
- Each CVE with patch version recommendations

---

### Phase 6: Linux Hardening Script Validation

**Duration:** 4-6 hours
**Priority:** After Kali testing

#### 6.1 - Setup Ubuntu VM for Testing

```bash
# Create clean Ubuntu 22.04 LTS VM
# Allocate: 2GB RAM, 20GB disk, bridge network
# Install: sudo, openssh-server
```

#### 6.2 - Copy and Run Hardening Scripts

```bash
# From Deployment/scripts/ directory:
./setup-ufw.sh          # Firewall configuration
./setup-ssh.sh          # SSH hardening
./setup-fail2ban.sh     # Intrusion prevention
./harden-host.sh        # General OS hardening
./setup-unattended-upgrades.sh  # Auto security updates
```

#### 6.3 - Validate Hardening

```bash
# Verify UFW firewall
sudo ufw status

# Check SSH config
sudo sshd -T | grep -E "PermitRootLogin|PasswordAuthentication"

# Verify Fail2Ban
sudo fail2ban-client status

# Check system logs for audit trail
sudo tail -f /var/log/audit/audit.log
```

---

### Phase 7: Performance Testing

**Duration:** 2-3 hours
**Priority:** Before staging

**Tools Options:**

- Apache JMeter (free, local)
- Loader.io (cloud, free tier)

**Load Test Scenarios:**

- 100 concurrent users
- 1000 requests in 60 seconds
- Measure response times
- Check for memory leaks
- Database connection pool limits

```bash
# Example with wrk (lightweight):
wrk -t4 -c100 -d30s http://localhost:9000/api/products
```

**Expected Metrics:**

- Response time: < 200ms for 95% of requests
- Error rate: < 0.1%
- CPU usage: < 70%
- Memory: stable (no leaks)

---

### Phase 8: Staging Environment Deployment

**Duration:** Full day
**Priority:** Before production

1. Set up staging EC2 instance
2. Configure RDS for staging database
3. Deploy application with Docker Compose
4. Run all security tests on staging
5. Verify monitoring/logging

---

### Phase 9: AWS Production Deployment

**Duration:** 1-2 days
**Priority:** Final step (after all phases complete)

Use Terraform configuration from `Deployment/Terraform/`:

```bash
cd Deployment/Terraform
terraform apply -var-file=terraform-prod.tfvars
```

---

## 🔧 Key Setup Files & Configurations

### Docker Development Environment

- **File:** `docker-compose.dev.yml`
- **Database:** PostgreSQL 16-alpine
- **API Server:** Node.js on port 9000
- **Nginx Reverse Proxy:** Ports 80/443
- **Networks:** frontend-net (nginx↔api), backend-net (api↔postgres)

### Environment Variables (.env)

```
NODE_ENV=development
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=pernstore
POSTGRES_DB_TEST=pernstore_test
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### Database Initialization

- **Main DB:** `server/config/init.sql` (creates pernstore database & schema)
- **Test DB:** Created in init-test.sh (creates pernstore_test database & schema)

---

## 🚨 Known Issues & Solutions

### Issue: Jest Unit Tests Failing

**Status:** Deferred - Unit tests have configuration issues
**Solution:** Use API testing + Postman for functional validation instead
**Next Step:** Revisit Jest setup after security testing complete

### Issue: PostgreSQL Authentication

**Root Cause:** Docker volume persistence + schema connection issues
**Fixed By:**

1. Exposing PostgreSQL port 5432 to host (docker-compose.dev.yml)
2. Creating separate init-test.sh for test database
3. Using proper database connection strings with POSTGRES_DB_TEST

---

## 📅 Testing Timeline (Recommended)

| Day                   | Activity                          | Duration  |
| --------------------- | --------------------------------- | --------- |
| **Today (30 May)**    | ✅ API + Manual testing           | Done      |
| **Tomorrow (31 May)** | 🔴 OWASP ZAP + SQLMap             | 4-6 hours |
| **Day 3 (1 Jun)**     | Burp Suite + Manual Pen Testing   | 6-8 hours |
| **Day 4 (2 Jun)**     | Docker Security + Linux Hardening | 8 hours   |
| **Day 5 (3 Jun)**     | Performance Testing               | 3-4 hours |
| **Day 6-7**           | Staging Deployment                | 2 days    |
| **Day 8**             | AWS Production                    | 1 day     |

---

## 🎯 Success Criteria (Before AWS Deployment)

- [ ] No CRITICAL vulnerabilities in Kali security scan
- [ ] No HIGH vulnerabilities in Docker image scan
- [ ] All hardening scripts execute without errors
- [ ] Performance tests pass (< 200ms response time, < 0.1% error rate)
- [ ] Authentication tests pass (all RBAC scenarios)
- [ ] SQL injection tests fail (queries properly parameterized)
- [ ] XSS tests fail (inputs properly sanitized)
- [ ] Rate limiting working (5+ requests throttled)
- [ ] Staging environment stable for 24 hours

---

## 📞 Quick Command Reference

### Start Development Environment

```bash
cd d:\HPE_SDLC\Secure-Web-Application-Dev
docker-compose -f docker-compose.dev.yml up -d
cd server && npm start
```

### Check Containers Status

```bash
docker-compose -f docker-compose.dev.yml ps
docker logs pern-prod-db
docker logs pern-prod-api
```

### API Testing

```bash
curl -X POST http://localhost:9000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"SecurePassword123",
    "fullname":"Test User"
  }'
```

### Postman Collections

- Location: Create new collection in Postman
- Save requests for all endpoints
- Add test scripts for validation
- Export for CI/CD integration

---

## 🔐 Security Considerations

**Vantage E-commerce App Security Features (Verify During Testing):**

- HttpOnly JWT tokens (no JavaScript access)
- Bcrypt password hashing (10 rounds)
- Rate limiting on auth endpoints
- Parameterized SQL queries (no injection risk)
- RBAC with admin/customer roles
- CORS whitelisting
- Helmet.js security headers
- 2FA support (MFA feature on feature/disable-mfa branch)

---

**Status:** Ready for Kali Linux security testing phase tomorrow! 🚀
