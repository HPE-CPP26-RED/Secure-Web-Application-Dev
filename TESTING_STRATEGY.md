# SDLC Testing Strategy - Pre-Deployment Checklist

## 1. CODE & FUNCTIONALITY TESTING

### Unit Tests

- [ ] Run server tests: `npm test` (in `/server`)
- [ ] Run client tests: `npm test` (in `/client`)
- [ ] Verify API endpoints respond correctly
- [ ] Check authentication flow (MFA, password reset)
- [ ] Test cart, orders, payment workflows

### Integration Tests

- [ ] Database connections working
- [ ] API-to-Database flow
- [ ] Third-party integrations (payment gateway, etc.)
- [ ] Frontend-to-API communication

### API Testing

- [ ] Use Postman/Swagger to test all endpoints
- [ ] Verify request/response formats
- [ ] Check error handling and status codes
- [ ] Test with invalid inputs

---

## 2. SECURITY TESTING (Using Kali Linux)

### Static Application Security Testing (SAST)

- [ ] Review `sonar.properties` and run SonarQube analysis
- [ ] Check for hardcoded secrets/credentials
- [ ] Review auth controllers for vulnerabilities
- [ ] Check SQL injection vulnerabilities

### Dynamic Application Security Testing (DAST)

```bash
# Penetration Testing with Kali Tools
- [ ] OWASP ZAP scanning
- [ ] Burp Suite Community testing
- [ ] SQL Injection tests
- [ ] XSS (Cross-Site Scripting) tests
- [ ] CSRF token validation
- [ ] Session hijacking attempts
- [ ] Rate limiting verification (see rateLimiter.js)
```

### Docker Security

- [ ] Scan Docker images for vulnerabilities: `docker scan <image>`
- [ ] Review Dockerfiles for security best practices
- [ ] Check for running as non-root user
- [ ] Verify secrets not hardcoded in images

### SBOM & VEX Review

- [ ] Analyze `sbom-client.cdx.json`, `sbom-server.cdx.json`, `sbom-docker.cdx.json`
- [ ] Review `vex-report.cdx.json`
- [ ] Check for known CVEs

---

## 3. LINUX HARDENING VALIDATION

### Test Hardening Scripts (on test VM first)

```bash
# Create a test environment - DO NOT run on production yet
1. [ ] Test on VM or Docker container (not live server)
2. [ ] Run scripts individually first, then together:
   - [ ] setup-fail2ban.sh          # Rate limiting, brute force protection
   - [ ] setup-ufw.sh                # Firewall rules
   - [ ] harden-ssh.sh               # SSH security
   - [ ] harden-host.sh              # OS hardening
   - [ ] setup-nginx.sh              # Web server config
   - [ ] setup-unattended-upgrades.sh # Auto patching

3. [ ] Verify each service still runs:
   - [ ] nginx starts
   - [ ] nodejs app starts
   - [ ] database connectivity
   - [ ] API endpoints accessible
```

### Hardening Verification

- [ ] Check fail2ban rules active: `sudo fail2ban-client status`
- [ ] Verify UFW firewall: `sudo ufw status`
- [ ] Review SSH config: `sudo sshd -T`
- [ ] Check audit logs: `sudo auditctl -l`
- [ ] Verify aide monitoring: `sudo aide --check`

---

## 4. PERFORMANCE & LOAD TESTING

- [ ] Test under expected load
- [ ] Database query performance
- [ ] Memory/CPU usage
- [ ] Response times
- [ ] Connection pooling (see MongoDB connection config)

---

## 5. DEPLOYMENT READINESS

### Docker & Docker Compose

- [ ] Test `docker-compose.prod.yml` locally
- [ ] Verify all services start correctly
- [ ] Check inter-service communication
- [ ] Test volume mounts
- [ ] Verify environment variables loaded

### Environment Configuration

- [ ] Review all `.env` variables needed
- [ ] Check Terraform configs (backend.tf, variables.tf)
- [ ] Verify secrets management approach
- [ ] Test different environments (dev, stage, prod)

### AWS EC2 Specific

- [ ] Security groups configured correctly
- [ ] VPC setup
- [ ] RDS database (if used) connectivity
- [ ] S3 bucket permissions (if used)
- [ ] IAM roles/policies
- [ ] CloudWatch monitoring setup

---

## 6. TESTING EXECUTION PHASES

### Phase 1: Local Testing (Week 1)

```
1. Run all unit & integration tests
2. Manual functional testing
3. API testing with Postman
4. Review code quality with SonarQube
```

### Phase 2: Security Testing (Week 2)

```
1. SAST scanning (SonarQube)
2. SBOM/VEX analysis
3. Docker image scanning
4. Kali Linux penetration testing:
   - Setup isolated test environment
   - Run OWASP ZAP
   - Manual penetration testing
   - Validate rate limiting
   - Test authentication bypass attempts
```

### Phase 3: Hardening Testing (Week 3)

```
1. Create test VM/Docker container
2. Deploy hardening scripts one-by-one
3. Verify each service still works
4. Run penetration tests on hardened system
5. Document any needed adjustments
```

### Phase 4: Staging (Week 4)

```
1. Deploy to AWS EC2 staging environment
2. Run full test suite
3. Performance testing
4. Failover/recovery testing
```

### Phase 5: Production Deployment

```
1. Final security audit
2. Backup/rollback plan verified
3. Monitoring/alerts configured
4. Go-live
```

---

## 7. KALI LINUX PENETRATION TESTING COMMANDS

```bash
# Network Scanning
sudo nmap -sV -p- localhost  # Service version detection

# Web Application Testing
zaproxy --cmd -config api.disablekey=true  # OWASP ZAP

# Brute Force Testing
hydra -L users.txt -P passwords.txt http-post-form "localhost/login:username=^USER^&password=^PASS^"

# SQL Injection Testing
sqlmap -u "http://localhost/api/products?id=1" --dbs

# XSS Testing
echo "<script>alert('XSS')</script>" | xdotool type --

# SSL/TLS Analysis
testssl.sh https://your-domain.com
```

---

## 8. TESTING CHECKLIST BY COMPONENT

### Client (React/Vite)

- [ ] All pages load correctly
- [ ] Forms validate properly
- [ ] Authentication redirects work
- [ ] MFA flow works end-to-end
- [ ] Cart operations (add/remove/checkout)
- [ ] Responsive design (mobile/tablet)
- [ ] XSS vulnerabilities tested

### Server (Node.js/Express)

- [ ] All routes accessible
- [ ] Authentication middleware working
- [ ] Rate limiting active
- [ ] Error handling consistent
- [ ] SQL injection tests passed
- [ ] API response times acceptable

### Database (PostgreSQL/MongoDB)

- [ ] Backups working
- [ ] Connection pooling optimized
- [ ] Query performance acceptable
- [ ] Data integrity verified

### Docker

- [ ] Images build successfully
- [ ] Services start in correct order
- [ ] Volumes mount correctly
- [ ] Networking between containers works

### Security Scripts

- [ ] No service disruption after running
- [ ] Firewall rules effective
- [ ] SSH hardening applied
- [ ] Fail2ban rules active
- [ ] Audit logs being recorded

---

## 9. SIGN-OFF CRITERIA

Before deploying to AWS:

- [ ] All unit tests pass (100%)
- [ ] Integration tests pass
- [ ] No critical/high-severity security issues
- [ ] All hardening scripts tested & verified
- [ ] Performance meets requirements
- [ ] Backup/recovery tested
- [ ] Monitoring configured
- [ ] Documentation up-to-date
- [ ] Team sign-off completed
