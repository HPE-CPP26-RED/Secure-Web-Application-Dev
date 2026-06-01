# Kali Linux Penetration Testing Guide for Your Application

## Quick Start

### 1. Setup Test Environment

```bash
# Clone your repo in Kali
git clone https://github.com/AravindKamath/Secure-Web-Application-Dev.git

# Build and run in Docker on Kali
cd Secure-Web-Application-Dev
docker-compose -f docker-compose.prod.yml up -d

# Your app will be at http://localhost (or your configured port)
```

---

## 2. Automated Security Testing

### OWASP ZAP (Web Application Security)

```bash
# Install if not present
sudo apt install zaproxy

# Start ZAP and test your app
zaproxy &

# OR run headless scan
zaproxy --cmd -config api.disablekey=true \
  -cmd -quickurl http://localhost:3000 \
  -cmd -quickout /tmp/zap-report.html
```

### SQLMap (SQL Injection Testing)

```bash
# Install
sudo apt install sqlmap

# Test your API endpoints
sqlmap -u "http://localhost:3000/api/products?id=1" --dbs
sqlmap -u "http://localhost:3000/api/users" --forms --batch
```

### Burp Suite Community

```bash
# Start Burp
burpsuite &

# Configure browser to use proxy: 127.0.0.1:8080
# Manually test authentication, session handling, etc.
```

---

## 3. Manual Penetration Testing

### Authentication Testing

```bash
# Test MFA bypass
# Test password reset flow
# Test JWT token tampering
# Test session fixation

# Commands to help:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'

# Capture and analyze responses with Burp Suite
```

### API Endpoint Testing

```bash
# Brute force common endpoints
for i in {1..100}; do
  curl -I http://localhost:3000/api/users/$i
done

# Test authorization bypass
curl -H "Authorization: Bearer INVALID_TOKEN" \
  http://localhost:3000/api/users
```

### Rate Limiting Testing (verifies rateLimiter.js)

```bash
# Should be blocked after threshold
for i in {1..100}; do
  curl http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' &
done

# Check if getting 429 (Too Many Requests)
```

### XSS Testing

```bash
# Test input fields with XSS payloads
# Use Burp Suite's XSS detector
# Manual testing in browser console

# Example payloads to test:
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
javascript:alert('XSS')
```

### CSRF Testing

```bash
# Verify CSRF tokens are present
# Test endpoints without valid CSRF token
# Check token expiration
```

---

## 4. Network Security Testing

### Port Scanning

```bash
# Scan your application ports
sudo nmap -sV -p 3000,5000,80,443 localhost

# Identify services and versions
sudo nmap -sV --script default localhost
```

### SSL/TLS Testing

```bash
# Install testssl
sudo apt install testssl.sh

# Test HTTPS/TLS configuration
testssl.sh https://your-domain.com

# Or if running locally on HTTPS
testssl.sh https://localhost:443
```

### Traffic Analysis

```bash
# Capture network traffic
sudo tcpdump -i lo -A 'tcp port 3000'

# Analyze with Wireshark
sudo wireshark &
```

---

## 5. Hardening Script Validation

### Test in Isolated Environment

```bash
# Create a test VM or Docker container
docker run -it ubuntu:20.04 /bin/bash

# Copy and run hardening scripts
# Verify application still works

# Check each script individually:
bash setup-ufw.sh              # Firewall
bash harden-ssh.sh             # SSH security
bash harden-host.sh            # OS hardening
bash setup-fail2ban.sh         # Brute force protection
bash setup-nginx.sh            # Web server hardening
bash setup-unattended-upgrades.sh  # Auto-patching

# After each: verify services running
systemctl status nginx
systemctl status fail2ban
systemctl status ufw
```

### Verify Hardening Applied

```bash
# Check UFW firewall rules
sudo ufw status verbose

# Check fail2ban jails
sudo fail2ban-client status
sudo fail2ban-client status sshd

# Check SSH configuration
sudo sshd -T | grep -i "permituserenvironment\|permitrootlogin"

# Check audit rules
sudo auditctl -l

# Check aide database
sudo aide --config=/etc/aide/aide.conf.d/aide.conf --check
```

---

## 6. Vulnerability Assessment

### Check Dependencies for Known CVEs

```bash
# NPM audit (run in client/ and server/ folders)
npm audit

# Generate SBOM if not done
cyclonedx-npm > sbom.json

# Scan with Trivy (container scanning)
trivy image myapp:latest
trivy image mydb:latest
```

### Review Security Reports

```bash
# Check your existing security files
cat security/sbom/sbom-client.cdx.json
cat security/sbom/sbom-server.cdx.json
cat security/vex/vex-report.cdx.json
cat security/reports/defense-in-depth-report.md
```

---

## 7. Performance & Stress Testing

### Load Testing with Apache Bench

```bash
# Simple load test
ab -n 1000 -c 10 http://localhost:3000/

# Test API endpoint
ab -n 1000 -c 10 http://localhost:3000/api/products
```

### Load Testing with wrk

```bash
# Install wrk
git clone https://github.com/wg/wrk
cd wrk && make

# Load test
./wrk -t4 -c100 -d30s http://localhost:3000/api/products
```

---

## 8. Testing Workflow for Your PERN Stack

### Day 1: Functional Testing

```bash
1. Start application in Kali Docker
2. Manual testing of all features
3. API testing with Postman/curl
4. Check logs for errors
```

### Day 2: Automated Security Scanning

```bash
1. Run OWASP ZAP
2. Run SQLMap on API endpoints
3. Review SonarQube analysis (sonar.properties configured)
4. Check npm audit results
```

### Day 3: Manual Penetration Testing

```bash
1. Auth testing (MFA, password reset)
2. Rate limiting verification
3. Session management testing
4. File upload/download security (if applicable)
```

### Day 4: Hardening Validation

```bash
1. Run hardening scripts on test VM
2. Penetration test hardened system
3. Verify all services functional
4. Document findings
```

### Day 5: Final Review

```bash
1. Compile security report
2. Address critical/high severity issues
3. Get team sign-off
4. Prepare for AWS deployment
```

---

## 9. Tools Reference

| Tool       | Purpose                | Install                       |
| ---------- | ---------------------- | ----------------------------- |
| OWASP ZAP  | Web app scanning       | `sudo apt install zaproxy`    |
| Burp Suite | Manual testing         | `sudo apt install burpsuite`  |
| SQLMap     | SQL injection testing  | `sudo apt install sqlmap`     |
| Nmap       | Network scanning       | `sudo apt install nmap`       |
| Wireshark  | Traffic analysis       | `sudo apt install wireshark`  |
| testssl.sh | SSL/TLS testing        | `sudo apt install testssl.sh` |
| wrk        | Load testing           | GitHub                        |
| Trivy      | Vulnerability scanning | `sudo apt install trivy`      |
| Nikto      | Web server scanning    | `sudo apt install nikto`      |

---

## 10. Common Vulnerabilities to Test (OWASP Top 10)

- [ ] Injection (SQL, NoSQL, OS)
- [ ] Broken Authentication (MFA bypass, session fixation)
- [ ] Sensitive Data Exposure (encryption, HTTPS)
- [ ] XML External Entities (XXE)
- [ ] Broken Access Control (authorization)
- [ ] Security Misconfiguration (headers, versions)
- [ ] Cross-Site Scripting (XSS)
- [ ] Insecure Deserialization
- [ ] Using Components with Known Vulnerabilities
- [ ] Insufficient Logging & Monitoring

---

## 11. Before AWS Deployment - Final Checklist

```bash
# 1. All tests passed
npm test

# 2. Security scan completed
zaproxy --cmd  # OWASP ZAP scan

# 3. No high/critical vulnerabilities
npm audit

# 4. Hardening scripts validated
# (test on staging VM first)

# 5. Docker images secured
docker scan myapp:latest
docker scan mydb:latest

# 6. Documentation updated
# - Known issues documented
# - Workarounds provided
# - Security considerations noted

# 7. Backup/Recovery tested
# - Database backup process verified
# - Restore tested
# - Time-to-recovery documented

# 8. Monitoring configured
# - CloudWatch alarms
# - Security alerts
# - Performance monitoring
```

---

## Quick Commands Reference

```bash
# Start app for testing
docker-compose -f docker-compose.prod.yml up

# Kill on port
sudo lsof -ti:3000 | xargs kill -9

# Check app health
curl http://localhost:3000/health

# View logs
docker logs -f container_name

# Security scan
zaproxy --cmd -config api.disablekey=true \
  -cmd -quickurl http://localhost:3000

# Test rate limiting
for i in {1..50}; do curl -i http://localhost:3000/api/auth/login; done
```
