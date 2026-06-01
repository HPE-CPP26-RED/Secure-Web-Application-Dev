# Remaining Work: Phases 5-10 Testing Plan

## Overview

This document outlines all pending security testing phases for the Vantage E-commerce application before AWS production deployment.

---

## Status Summary

| Phase | Name                   | Status       | Priority | Target Date |
| ----- | ---------------------- | ------------ | -------- | ----------- |
| 1     | Kali Setup             | ✅ COMPLETED | -        | June 1      |
| 2     | OWASP ZAP              | ✅ COMPLETED | -        | June 1      |
| 3     | SQLMap Testing         | ✅ COMPLETED | -        | June 1      |
| 4     | Auth & AuthZ Testing   | ✅ COMPLETED | -        | June 2      |
| 5     | API Security + Logging | 🔴 PENDING   | HIGH     | June 3      |
| 6     | Docker Container Scan  | 🔴 PENDING   | HIGH     | June 3      |
| 7     | Linux Hardening        | 🔴 PENDING   | MEDIUM   | June 4      |
| 8     | Performance Testing    | 🔴 PENDING   | MEDIUM   | June 5      |
| 9     | Staging Deployment     | 🔴 PENDING   | HIGH     | June 6      |
| 10    | Production Deployment  | 🔴 PENDING   | HIGH     | June 8      |

---

## Phase 5: API Security & Logging Testing

**Target Date:** June 3, 2026  
**Priority:** 🔴 HIGH  
**Tools:** Burp Suite + Postman + Log Analysis  
**Duration Estimate:** 4-6 hours

### Objectives

- ✅ Verify authentication mechanisms work correctly
- ✅ Validate authorization rules enforced
- ✅ Test role-based access control (RBAC)
- ✅ Verify token expiration and refresh flows

### Test Cases

#### Test 4.1: Login with Valid Credentials

```
Test: POST /api/auth/login
Body: {
  "email": "vivekpai2005810@gmail.com",
  "password": "Vivek@123"
}
Expected Response:
  - Status: 200 OK
  - Body: {
      "token": "eyJ...",
      "user": {
        "id": 1,
        "email": "vivekpai2005810@gmail.com",
        "role": "user"
      }
    }
  - Cookies: Set-Cookie: jwt=...; HttpOnly; Secure; SameSite=Strict
```

**Acceptance Criteria:**

- ✅ JWT token issued with correct payload
- ✅ Token expires in 24 hours
- ✅ HttpOnly flag prevents JavaScript access
- ✅ Secure flag enforces HTTPS

#### Test 4.2: Login with Invalid Password

```
Test: POST /api/auth/login
Body: {
  "email": "vivekpai2005810@gmail.com",
  "password": "WrongPassword123"
}
Expected Response:
  - Status: 401 Unauthorized
  - Body: {"error": "Invalid credentials"}
  - No token issued
```

**Acceptance Criteria:**

- ✅ Denial message generic (no user enumeration)
- ✅ No token issued
- ✅ Rate limit counter incremented
- ✅ After 5 failed attempts: 15-minute lockout

#### Test 4.3: Access Protected Endpoint Without Token

```
Test: GET /api/products
Headers: (No Authorization header)
Expected Response:
  - Status: 401 Unauthorized
  - Body: {"error": "No token provided"}
```

**Acceptance Criteria:**

- ✅ Access denied without token
- ✅ No sensitive data exposed

#### Test 4.4: Access with Expired Token

```
Test: GET /api/products
Headers: Authorization: Bearer <expired_jwt>
Expected Response:
  - Status: 401 Unauthorized
  - Body: {"error": "Token expired"}
```

**Acceptance Criteria:**

- ✅ Expired tokens rejected
- ✅ Token refresh endpoint accessible
- ✅ New token issued on refresh

### Success Criteria

- ✅ 100% of test cases pass
- ✅ No authentication bypass possible
- ✅ No privilege escalation possible
- ✅ RBAC correctly enforced

### Tools & Resources

- Postman (API testing)
- curl (command-line testing)
- Burp Suite Community (optional - traffic interception)

---

## Phase 5: API Security & Logging Testing

**Target Date:** June 3, 2026  
**Priority:** 🔴 HIGH  
**Tools:** Burp Suite + Postman + Log Analysis  
**Duration Estimate:** 6-8 hours

### Objectives

- ✅ Verify all API responses contain correct security headers
- ✅ Test request/response logging functionality
- ✅ Verify sensitive data not logged
- ✅ Test API rate limiting per endpoint

### Test Cases

#### Test 5.1: Security Headers Validation

```bash
# Command:
curl -I http://172.22.128.1:9000/api

# Expected Headers:
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

**Acceptance Criteria:**

- ✅ All security headers present
- ✅ HSTS max-age ≥ 1 year
- ✅ CSP policy enforced
- ✅ X-Frame-Options prevents clickjacking

#### Test 5.2: API Request Rate Limiting by Endpoint

```
Endpoint: /api/auth/login
Rate Limit: 5 requests per minute
Test: Send 10 requests rapidly
Expected:
  - Requests 1-5: 200/401 status
  - Requests 6-10: 429 (Too Many Requests)
```

**Acceptance Criteria:**

- ✅ Rate limiting enforced per IP
- ✅ 429 response includes Retry-After header
- ✅ Lockout duration: 15 minutes
- ✅ Limit applies to login endpoint specifically

#### Test 5.3: Sensitive Data Not in Logs

```
Test: Perform login with password "Vivek@123"
Action: Check server logs at /var/log/app.log
Expected:
  - Request logged: ✅ POST /api/auth/login
  - Password logged: ❌ NO PASSWORD IN LOGS
  - Response logged: ✅ Only status code and user ID
```

**Acceptance Criteria:**

- ✅ Passwords never logged
- ✅ JWT tokens not logged (only expiration time)
- ✅ Request body sanitized in logs
- ✅ Personally identifiable info (PII) minimized

#### Test 5.4: CORS Policy Enforcement

```javascript
// Test: XMLHttpRequest from unauthorized origin
// Origin: http://attacker.com
fetch("http://172.22.128.1:9000/api/products", {
  method: "GET",
  credentials: "include",
});

// Expected:
// - Browser blocks request (CORS policy rejected)
// - Status: 403 Forbidden (CORS preflight failed)
```

**Acceptance Criteria:**

- ✅ Only whitelisted origins can access API
- ✅ Credentials not sent cross-origin
- ✅ Preflight OPTIONS requests validated

### Success Criteria

- ✅ 100% security headers present
- ✅ Rate limiting working on all authenticated endpoints
- ✅ No sensitive data in logs
- ✅ CORS properly configured

### Tools & Resources

- Burp Suite (security headers verification)
- curl (header testing)
- LogStash/Kibana (optional - log analysis)
- Browser DevTools (CORS testing)

### Deliverables

- Security headers audit report
- Rate limiting verification results
- Log analysis and sanitization report

---

## Phase 6: Docker Container Security Scan

**Target Date:** June 3, 2026  
**Priority:** 🔴 HIGH  
**Tools:** Trivy + Docker Scout  
**Duration Estimate:** 2-3 hours

### Objectives

- ✅ Scan Docker images for known vulnerabilities
- ✅ Verify base image is secure and up-to-date
- ✅ Check for misconfigurations in Dockerfile
- ✅ Verify container runs as non-root user

### Test Cases

#### Test 6.1: Container Image Vulnerability Scan

```bash
# Command:
trivy image secure-web-app-dev_api:latest

# Expected Results:
# CRITICAL: 0
# HIGH: 0
# MEDIUM: ≤ 3 (with remediation plan)
# LOW: ≤ 10
```

**Acceptance Criteria:**

- ✅ No CRITICAL vulnerabilities
- ✅ HIGH vulnerabilities patched
- ✅ All vulnerabilities have remediation plan
- ✅ Base image from trusted source (Alpine/Debian)

#### Test 6.2: Non-Root User Enforcement

```bash
# Check Dockerfile:
USER appuser  # ✅ PASS - running as non-root

# Verify at runtime:
docker exec <container_id> whoami
# Expected output: appuser (NOT root)
```

**Acceptance Criteria:**

- ✅ Container runs as non-root user
- ✅ appuser UID ≥ 1000 (not system user)
- ✅ No sudo access in container

#### Test 6.3: Volume Permissions

```bash
# Test: Verify volumes don't contain sensitive files
docker inspect <container_id> | grep -A 5 Mounts

# Expected:
# - /var/run/secrets: mounted read-only
# - /app: mounted with limited permissions
# - /tmp: ephemeral (no persistence)
```

**Acceptance Criteria:**

- ✅ Secrets mounted read-only
- ✅ Application files not writable by container
- ✅ No sensitive files in volumes

### Success Criteria

- ✅ 0 CRITICAL vulnerabilities
- ✅ All HIGH vulnerabilities remediated
- ✅ Container runs as non-root
- ✅ Base image updated (within 1 month)

### Tools & Resources

- Trivy (vulnerability scanner)
- Docker Scout (image analysis)
- Snyk (optional - continuous monitoring)

### Deliverables

- Docker container vulnerability report
- Dockerfile security audit
- Remediation plan for findings

---

## Phase 7: Linux Hardening Verification

**Target Date:** June 4, 2026  
**Priority:** MEDIUM  
**Tools:** Bash scripts + auditd  
**Duration Estimate:** 4 hours

### Objectives

- ✅ Verify all hardening scripts executed successfully
- ✅ Test SELinux/AppArmor policies
- ✅ Verify firewall rules (UFW) configured
- ✅ Validate SSH hardening
- ✅ Check unattended upgrades running

### Test Cases

#### Test 7.1: Firewall Rules Verification

```bash
# Test: Verify UFW firewall active
sudo ufw status

# Expected:
Status: active
Rule 1: Anywhere on 22/tcp (SSH)
Rule 2: Anywhere on 80/tcp (HTTP)
Rule 3: Anywhere on 443/tcp (HTTPS)
```

**Acceptance Criteria:**

- ✅ UFW enabled
- ✅ Only necessary ports open
- ✅ Inbound rules restrict by service
- ✅ Default policy: DENY

#### Test 7.2: SSH Hardening

```bash
# Test: Verify SSH configuration
grep "^PermitRootLogin" /etc/ssh/sshd_config
# Expected: PermitRootLogin no

grep "^PasswordAuthentication" /etc/ssh/sshd_config
# Expected: PasswordAuthentication no

grep "^Port 22" /etc/ssh/sshd_config
# Expected: Port changed to non-standard
```

**Acceptance Criteria:**

- ✅ Root login disabled
- ✅ Password auth disabled (key-only)
- ✅ SSH on non-standard port
- ✅ Protocol version 2 only

#### Test 7.3: Unattended Upgrades

```bash
# Test: Verify automatic security updates
sudo systemctl status unattended-upgrades

# Expected:
# Status: active (running)
# Last run: Within last 7 days
```

**Acceptance Criteria:**

- ✅ Unattended upgrades enabled
- ✅ Security updates automatic
- ✅ Reboot scheduled for non-business hours
- ✅ Logs show successful updates

#### Test 7.4: Fail2Ban Configuration

```bash
# Test: Verify Fail2Ban protecting SSH
sudo fail2ban-client status sshd

# Expected:
# Status: enabled
# Currently banned: ≥ 0
# Ban time: ≥ 600 seconds
```

**Acceptance Criteria:**

- ✅ Fail2Ban enabled for SSH
- ✅ Rate limiting active
- ✅ Banned IPs persist for ≥ 10 minutes
- ✅ Logs show blocked attempts

### Success Criteria

- ✅ All hardening scripts executed
- ✅ Firewall correctly configured
- ✅ SSH properly hardened
- ✅ Automatic updates enabled
- ✅ Intrusion detection working

### Tools & Resources

- UFW (firewall)
- Fail2Ban (intrusion prevention)
- auditd (system audit logging)
- aide (file integrity monitoring)

### Deliverables

- Linux hardening verification report
- Firewall rule audit
- SSH configuration audit

---

## Phase 8: Performance & Load Testing

**Target Date:** June 5, 2026  
**Priority:** MEDIUM  
**Tools:** Apache JMeter + Wrk  
**Duration Estimate:** 6 hours

### Objectives

- ✅ Verify API response times under load
- ✅ Test database connection pooling
- ✅ Identify performance bottlenecks
- ✅ Validate caching mechanisms

### Test Cases

#### Test 8.1: API Response Time

```bash
# Command:
wrk -t12 -c400 -d30s http://172.22.128.1:9000/api

# Expected Results:
# Requests/sec: ≥ 1000
# Avg Latency: ≤ 200ms
# P99 Latency: ≤ 500ms
# Error rate: < 0.1%
```

**Acceptance Criteria:**

- ✅ Average response < 200ms
- ✅ P99 response < 500ms
- ✅ < 0.1% errors under load
- ✅ No memory leaks detected

#### Test 8.2: Database Connection Pooling

```
Test: Send 100 concurrent requests
Monitor: SELECT * FROM pg_stat_activity;
Expected:
- Active connections: ≤ 20 (pool size)
- Idle connections: Recycled
- Wait queue: None
```

**Acceptance Criteria:**

- ✅ Connection pool sized correctly
- ✅ No connection leaks
- ✅ Idle connections released
- ✅ Requests queued properly

#### Test 8.3: Cache Hit Rate

```
Test: Send 1000 identical requests to /api/products
Expected:
- First request: DB query, 150ms response
- Requests 2-1000: Cache hit, 5ms response
- Cache hit ratio: ≥ 95%
```

**Acceptance Criteria:**

- ✅ Redis cache enabled
- ✅ Cache hit ratio ≥ 95%
- ✅ Cache invalidation working
- ✅ No stale data served

### Success Criteria

- ✅ Average response time ≤ 200ms
- ✅ P99 response time ≤ 500ms
- ✅ Error rate < 0.1%
- ✅ Connection pool functioning
- ✅ Cache working effectively

### Tools & Resources

- Apache JMeter (load testing)
- Wrk (performance benchmarking)
- Grafana (metrics visualization)
- Prometheus (metrics collection)

### Deliverables

- Performance test report
- Load test results with metrics
- Recommendations for optimization

---

## Phase 9: Staging Environment Deployment

**Target Date:** June 6-7, 2026  
**Priority:** 🔴 HIGH  
**Platform:** AWS (Staging)  
**Duration Estimate:** 8-10 hours

### Objectives

- ✅ Deploy application to staging environment
- ✅ Run smoke tests in staging
- ✅ Verify all features functioning
- ✅ Perform final security checks
- ✅ Monitor stability for 24 hours

### Deployment Checklist

#### Pre-Deployment (June 6 - Morning)

- ✅ Build Docker images
- ✅ Push to AWS ECR
- ✅ Update Terraform variables
- ✅ Review AWS Deployment Checklist
- ✅ Backup production database

#### Deployment (June 6 - Afternoon)

```bash
# Command:
terraform apply -var-file="staging.tfvars" -var "environment=staging"

# Expected:
# - ECS cluster created
# - Load balancer configured
# - RDS instance provisioned
# - CloudFront CDN enabled
# - CloudWatch monitoring active
```

**Acceptance Criteria:**

- ✅ All infrastructure deployed
- ✅ Health checks passing
- ✅ Load balancer routing traffic
- ✅ Database reachable

#### Post-Deployment Testing (June 6 - Evening)

```
Smoke Tests:
1. API Health Check: GET /api → 200
2. Database Query: GET /api/products → 200
3. Authentication: POST /api/auth/login → 200
4. File Upload: POST /api/upload → 200
5. Email Service: POST /api/contact → 200
```

**Acceptance Criteria:**

- ✅ 100% smoke tests pass
- ✅ No 5xx errors
- ✅ Database connected
- ✅ All services running

#### Stability Monitoring (June 7 - 24 hours)

```
Metrics to Monitor:
- API Error Rate: Target < 0.1%
- Average Response Time: Target < 200ms
- CPU Usage: Target < 70%
- Memory Usage: Target < 80%
- Database Query Time: Target < 100ms
```

**Acceptance Criteria:**

- ✅ Stability for 24 hours
- ✅ No crashes or restarts
- ✅ All metrics within targets
- ✅ No security incidents

### Success Criteria

- ✅ All infrastructure deployed
- ✅ 100% smoke tests pass
- ✅ 24-hour stability verified
- ✅ No security incidents
- ✅ Performance metrics acceptable

### Tools & Resources

- Terraform (infrastructure)
- AWS CLI (deployment)
- CloudWatch (monitoring)
- Custom health check scripts

### Deliverables

- Staging deployment report
- Smoke test results
- 24-hour monitoring report

---

## Phase 10: Production Deployment

**Target Date:** June 8, 2026  
**Priority:** 🔴 CRITICAL  
**Platform:** AWS (Production)  
**Duration Estimate:** 4-6 hours

### Objectives

- ✅ Deploy to production with zero downtime
- ✅ Execute blue-green deployment strategy
- ✅ Verify all systems functioning
- ✅ Monitor for 24+ hours
- ✅ Document deployment report

### Deployment Strategy: Blue-Green

#### Step 1: Provision Green Environment

```bash
# Deploy to "green" environment (new)
terraform apply -var-file="prod.tfvars" -var "environment=production-green"
```

**Acceptance Criteria:**

- ✅ Green environment fully operational
- ✅ All services responding
- ✅ Database replicated and synchronized
- ✅ Smoke tests pass on green

#### Step 2: Traffic Switch

```bash
# Update load balancer to route to green
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-green-instance-id,Port=80
```

**Acceptance Criteria:**

- ✅ Traffic gradually shifted to green
- ✅ Error rate remains < 0.1%
- ✅ Old sessions redirected
- ✅ No user disruption

#### Step 3: Monitoring & Rollback

```
Rollback Decision Criteria:
- If error rate > 5% → Immediate rollback
- If response time > 500ms → Investigate
- If database connection issues → Rollback
- After 1 hour stable → Keep green, decommission blue
```

**Acceptance Criteria:**

- ✅ Real-time monitoring active
- ✅ Rollback mechanism tested
- ✅ On-call team notified
- ✅ Incident commander assigned

### Post-Deployment Verification

#### Health Checks (Hour 1)

```
1. API responding: GET / → 200
2. Users can login: POST /auth/login → 200
3. Products loading: GET /products → 200
4. Orders processing: POST /orders → 201
5. Payment gateway: Payment test → Success
```

#### Extended Monitoring (24+ hours)

```
Metrics:
- API error rate: < 0.1%
- P95 response time: < 300ms
- Database query time: < 100ms
- CPU usage: < 60%
- Memory usage: < 75%
- No customer complaints
```

### Success Criteria

- ✅ Zero downtime deployment
- ✅ All systems functional
- ✅ Error rate < 0.1%
- ✅ Response times normal
- ✅ 24+ hour stability
- ✅ No rollback required

### Tools & Resources

- Terraform (infrastructure)
- AWS CLI (deployment)
- CloudWatch (monitoring)
- PagerDuty (on-call alerts)
- Custom health check scripts

### Deliverables

- Production deployment report
- Health check verification
- 24+ hour monitoring report
- Post-deployment security audit

---

## Critical Dependencies & Prerequisites

### Before Starting Phase 4:

- ✅ Phase 1-3 completed
- ✅ Docker containers restarted (CSP fix from Phase 2)
- ✅ ZAP re-scan completed and passed
- ✅ SQLMap testing confirmed no SQL injection

### Before Starting Phase 5:

- ✅ Phase 4 authentication testing passed
- ✅ All rate limiting thresholds configured
- ✅ Logging infrastructure verified

### Before Starting Phase 6:

- ✅ Docker images built locally
- ✅ AWS ECR repository created
- ✅ Trivy scanning tool installed on Kali

### Before Starting Phase 7:

- ✅ Linux hardening scripts reviewed
- ✅ All shell scripts have execute permissions
- ✅ SELinux policies compiled

### Before Starting Phase 8:

- ✅ Load testing tools installed (JMeter/Wrk)
- ✅ Performance baseline documented
- ✅ Monitoring infrastructure ready

### Before Starting Phase 9:

- ✅ All previous phases completed
- ✅ Terraform scripts tested locally
- ✅ AWS credentials configured
- ✅ RDS backup created

### Before Starting Phase 10:

- ✅ Phase 9 staging deployment stable for 24 hours
- ✅ Staging smoke tests 100% pass
- ✅ Production rollback procedure tested
- ✅ On-call team briefed and ready

---

## Risk Assessment

| Risk                    | Probability | Impact   | Mitigation                 |
| ----------------------- | ----------- | -------- | -------------------------- |
| Authentication bypass   | Low         | Critical | Complete Phase 4 testing   |
| Docker vulnerability    | Medium      | High     | Phase 6 Trivy scan         |
| Performance degradation | Medium      | High     | Phase 8 load testing       |
| Deployment failure      | Low         | Critical | Phase 9 staging validation |
| Data breach in staging  | Low         | High     | Segregate staging data     |

---

## Success Criteria Summary

### All Phases Must Pass:

- ✅ Phases 1-3: ✅ COMPLETED
- 🔴 Phase 4: Authentication 100% pass rate
- 🔴 Phase 5: Security headers & rate limiting verified
- 🔴 Phase 6: No CRITICAL vulnerabilities
- 🔴 Phase 7: All hardening scripts verified
- 🔴 Phase 8: Performance targets met
- 🔴 Phase 9: 24-hour stability achieved
- 🔴 Phase 10: Zero-downtime production deployment

### Deployment Gate Criteria:

- ✅ 0 CRITICAL security vulnerabilities
- ✅ 0 unpatched HIGH vulnerabilities
- ✅ API response time < 200ms average
- ✅ Error rate < 0.1%
- ✅ Authentication & authorization working
- ✅ Rate limiting active
- ✅ All logs sanitized
- ✅ Disaster recovery plan tested

---

## Timeline

```
June 2:    Phase 4 - Authentication Testing (8 hours)
June 3:    Phase 5 - API Security (8 hours) + Phase 6 - Docker Scan (3 hours)
June 4:    Phase 7 - Linux Hardening (4 hours)
June 5:    Phase 8 - Performance Testing (6 hours)
June 6-7:  Phase 9 - Staging Deployment + 24hr monitoring
June 8:    Phase 10 - Production Deployment
```

---

## Escalation Procedure

### If Phase 4-7 Fails:

1. Stop all deployments
2. Document findings
3. Return to development for fixes
4. Re-test failed phase
5. Resume testing sequence

### If Phase 8 Performance Failed:

1. Profile application
2. Optimize bottlenecks
3. Re-run load tests
4. Validate improvements
5. Proceed to Phase 9

### If Phase 9 Staging Fails:

1. Keep green environment for troubleshooting
2. Fix issues in code/infrastructure
3. Redeploy to green
4. Re-run 24-hour stability test
5. Update Phase 10 plan accordingly

### If Phase 10 Production Fails:

1. Execute rollback procedure
2. Revert to blue environment
3. Investigate root cause
4. Fix and test in staging
5. Retry production deployment

---

## Contact & Support

- **Security Lead:** Vivek Pai
- **DevOps Lead:** [To be assigned]
- **Database Admin:** [To be assigned]
- **On-Call Contact:** [To be configured for Phase 10]

---

## Document Control

| Version | Date         | Author | Changes                   |
| ------- | ------------ | ------ | ------------------------- |
| 1.0     | June 1, 2026 | Vivek  | Initial document creation |

---

**Status:** APPROVED FOR PHASE 4 EXECUTION  
**Last Updated:** June 1, 2026  
**Next Review:** June 2, 2026 (Post Phase 4)
