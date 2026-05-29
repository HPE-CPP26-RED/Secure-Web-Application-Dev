# AWS EC2 Deployment Pre-Flight Checklist

## Phase 1: Pre-Deployment (Local Testing)

### Infrastructure as Code Review

- [ ] Review Terraform files:
  - [ ] `Deployment/Terraform/provider.tf` - AWS provider configured correctly
  - [ ] `Deployment/Terraform/variables.tf` - All variables defined
  - [ ] `Deployment/Terraform/main.tf` - Resources properly configured
  - [ ] `Deployment/Terraform/backend.tf` - Backend storage (S3, DynamoDB)
  - [ ] `Deployment/Terraform/outputs.tf` - Output values for use
  - [ ] Environment-specific vars: `terraform-dev.tfvars`, `terraform-stage.tfvars`, `terraform-prod.tfvars`

### AWS Account & Permissions

- [ ] AWS account created
- [ ] IAM user created with appropriate permissions
- [ ] AWS CLI configured: `aws configure`
- [ ] Verify credentials: `aws sts get-caller-identity`

### Secrets Management

- [ ] AWS Secrets Manager or Parameter Store planned
- [ ] Environment variables documented
- [ ] No hardcoded secrets in code
- [ ] `.env` files not committed to Git
- [ ] Database passwords secured

---

## Phase 2: AWS Resource Planning

### Compute

- [ ] EC2 instance type selected (t3.micro for testing, appropriate size for prod)
- [ ] Key pair created and secured
- [ ] Security groups defined (see below)
- [ ] VPC and subnet configured

### Database

- [ ] RDS for PostgreSQL (recommended over self-hosted on EC2)
  - [ ] Instance type
  - [ ] Storage allocation
  - [ ] Backup retention
  - [ ] Multi-AZ for production
- OR
- [ ] Self-managed PostgreSQL/MongoDB on EC2
  - [ ] Volume size for data
  - [ ] Backup strategy

### Storage

- [ ] S3 bucket for uploads/assets (if needed)
- [ ] CloudFront CDN for static content (optional)
- [ ] EBS volumes sized appropriately

### Networking

- [ ] VPC configured
- [ ] Subnets (public/private)
- [ ] Internet Gateway
- [ ] NAT Gateway (if using private subnets)
- [ ] Route tables

### Security Groups

```
EC2 Security Group Rules:
- [ ] SSH (22) - from your IP only
- [ ] HTTP (80) - from 0.0.0.0/0 (or ALB)
- [ ] HTTPS (443) - from 0.0.0.0/0 (or ALB)
- [ ] Application port (3000) - from ALB only
- [ ] Database port (5432/27017) - from EC2 only (NOT from internet)

Database Security Group Rules:
- [ ] PostgreSQL (5432) - from EC2 security group only
- [ ] MongoDB (27017) - from EC2 security group only
```

### Load Balancing (Optional but Recommended)

- [ ] Application Load Balancer (ALB) created
- [ ] Target groups configured
- [ ] SSL/TLS certificate from ACM
- [ ] Health checks configured

---

## Phase 3: AWS Infrastructure Deployment

### Terraform Deployment

```bash
# Initialize Terraform
cd Deployment/Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment (review before applying)
terraform plan -var-file=terraform-prod.tfvars -out=tfplan

# Apply configuration
terraform apply tfplan

# Save output values
terraform output > aws-outputs.txt
```

### Verify AWS Resources

```bash
# EC2 instances running
aws ec2 describe-instances --region us-east-1

# Security groups configured
aws ec2 describe-security-groups --region us-east-1

# RDS database status
aws rds describe-db-instances --region us-east-1

# Key pairs available
aws ec2 describe-key-pairs --region us-east-1
```

---

## Phase 4: EC2 Instance Setup

### Initial EC2 Configuration

```bash
# Get EC2 instance IP
EC2_IP=$(aws ec2 describe-instances --region us-east-1 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "EC2 IP: $EC2_IP"

# Connect via SSH
ssh -i your-key.pem ubuntu@$EC2_IP

# Update system
sudo apt update && sudo apt upgrade -y
```

### Install Dependencies

```bash
# Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Docker
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# PostgreSQL client (if using RDS)
sudo apt install -y postgresql-client

# Nginx
sudo apt install -y nginx

# Git
sudo apt install -y git
```

### Clone Application Repository

```bash
cd /home/ubuntu
git clone https://github.com/AravindKamath/Secure-Web-Application-Dev.git
cd Secure-Web-Application-Dev
git checkout main  # or your deployment branch
```

---

## Phase 5: Application Deployment

### Configure Environment Variables

```bash
# Create .env file on EC2
cd /home/ubuntu/Secure-Web-Application-Dev

cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/dbname
JWT_SECRET=$(openssl rand -base64 32)
AWS_REGION=us-east-1
# Add other required variables
EOF

# Secure permissions
chmod 600 .env
```

### Deploy with Docker Compose

```bash
# Create production docker-compose override
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  server:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    restart: always
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "/ecs/secure-web-app"
        awslogs-region: "us-east-1"
EOF

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify services running
docker-compose ps
```

### Test Application

```bash
# Health check
curl http://localhost:3000/health

# Check logs
docker-compose logs -f server
docker-compose logs -f client

# Verify database connection
docker exec -it server npm run migrate  # if migrations exist
```

---

## Phase 6: Apply Hardening Scripts

### Upload Hardening Scripts

```bash
# From your local machine
scp -i your-key.pem -r Deployment/scripts ubuntu@$EC2_IP:/tmp/

# Connect to EC2
ssh -i your-key.pem ubuntu@$EC2_IP
```

### Run Hardening Scripts (in order)

```bash
cd /tmp/scripts

# 1. Setup UFW (Firewall) - DO THIS FIRST
sudo bash setup-ufw.sh

# Verify firewall rules
sudo ufw status

# 2. Harden SSH
sudo bash harden-ssh.sh

# Verify SSH config
sudo sshd -T | grep -i permitrootlogin

# 3. Setup Fail2Ban (Brute force protection)
sudo bash setup-fail2ban.sh

# Check fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status sshd

# 4. General OS hardening
sudo bash harden-host.sh

# 5. Setup Nginx (Web server)
sudo bash setup-nginx.sh

# Verify nginx
sudo systemctl status nginx

# 6. Setup unattended upgrades (Auto-patching)
sudo bash setup-unattended-upgrades.sh

# Verify automatic updates
sudo apt install -y unattended-upgrades
sudo systemctl status apt-daily-upgrade.service
```

### Verify Services After Hardening

```bash
# Docker services still running
docker-compose ps

# Application accessible
curl http://localhost:3000/health

# Nginx proxy working (if configured)
curl http://your-domain.com

# Fail2ban monitoring SSH
sudo fail2ban-client status sshd

# UFW firewall rules active
sudo ufw status verbose
```

---

## Phase 7: SSL/TLS Configuration

### Obtain SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos

# Auto-renewal check
sudo systemctl status certbot.timer
```

### Configure Nginx as Reverse Proxy

```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/secure-web-app << EOF
upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/secure-web-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 8: Monitoring & Logging

### CloudWatch Setup

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a query -m ec2 -c default -s
```

### Application Logs

```bash
# Docker logs to CloudWatch (update docker-compose)
docker logs --follow server

# System logs
sudo tail -f /var/log/syslog

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

### Set Up Alerts

```bash
# CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "Alert if CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

# Disk usage
aws cloudwatch put-metric-alarm \
  --alarm-name low-disk-space \
  --alarm-description "Alert if disk space < 10%" \
  --metric-name DiskSpaceUtilization
```

---

## Phase 9: Database Setup

### RDS Database

```bash
# Test connection from EC2
psql -h your-rds-endpoint.rds.amazonaws.com \
  -U admin \
  -d database_name

# Run migrations
docker exec -it server npm run migrate
```

### Backup Configuration

```bash
# Enable automated backups in RDS console
# - Backup retention: 30 days (prod)
# - Backup window: 3 AM UTC
# - Multi-AZ: Yes (for production)

# Test restore
aws rds create-db-snapshot \
  --db-instance-identifier prod-db \
  --db-snapshot-identifier prod-db-backup-$(date +%s)
```

---

## Phase 10: Auto-Scaling (Optional)

### Create AMI from Instance

```bash
# Stop instance (optional but recommended)
aws ec2 stop-instances --instance-ids i-xxxxxx

# Create image
aws ec2 create-image \
  --instance-id i-xxxxxx \
  --name "secure-web-app-$(date +%Y%m%d)"

# Create launch template from AMI
aws ec2 create-launch-template \
  --launch-template-name secure-web-app \
  --launch-template-data file://launch-template.json
```

### Auto Scaling Group

```bash
# Create Auto Scaling Group (via Terraform recommended)
# Scales from 1 to 5 instances based on CPU
```

---

## Phase 11: Disaster Recovery

### Backup Strategy

```bash
# Database backups (RDS automated)
# Document backup location and retention

# Application backups
tar -czf /backup/app-backup-$(date +%Y%m%d).tar.gz /home/ubuntu/Secure-Web-Application-Dev

# Store backups in S3
aws s3 sync /backup s3://your-backup-bucket/
```

### Recovery Procedure

```bash
# Document step-by-step recovery:
1. Provision new EC2 instance from latest AMI
2. Restore database from latest RDS snapshot
3. Restore application files
4. Verify all services running
5. Update DNS/load balancer
6. Test application
```

---

## Phase 12: Final Pre-Launch Checklist

Before going live:

### Security

- [ ] SSL/TLS certificate installed and valid
- [ ] Security groups restricted appropriately
- [ ] SSH key secured (not world-readable)
- [ ] Database credentials in Secrets Manager
- [ ] No default credentials left
- [ ] All security patches applied
- [ ] Hardening scripts validated
- [ ] WAF rules configured (optional)

### Functionality

- [ ] Application starts on boot
- [ ] All API endpoints working
- [ ] Database connectivity verified
- [ ] File uploads working (if applicable)
- [ ] Authentication/MFA working
- [ ] Payment processing working (if applicable)

### Performance

- [ ] Response times acceptable
- [ ] Database queries optimized
- [ ] Caching configured
- [ ] CDN configured (if applicable)
- [ ] Load testing passed

### Operations

- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Log aggregation working
- [ ] Backup testing passed
- [ ] Recovery procedure documented
- [ ] Runbook created for common tasks
- [ ] Team trained on deployment

### Documentation

- [ ] Architecture diagram updated
- [ ] Security considerations documented
- [ ] Known issues documented
- [ ] Runbook for troubleshooting
- [ ] Emergency contacts listed

---

## Quick Deployment Command Reference

```bash
# Full deployment from scratch
terraform init
terraform plan -var-file=terraform-prod.tfvars
terraform apply -var-file=terraform-prod.tfvars

# On EC2 instance
sudo bash /tmp/scripts/setup-ufw.sh
sudo bash /tmp/scripts/harden-ssh.sh
sudo bash /tmp/scripts/setup-fail2ban.sh
sudo bash /tmp/scripts/harden-host.sh
sudo bash /tmp/scripts/setup-nginx.sh
sudo bash /tmp/scripts/setup-unattended-upgrades.sh

docker-compose -f docker-compose.prod.yml up -d

# Verify
curl https://your-domain.com
docker-compose ps
sudo fail2ban-client status
```

---

## Troubleshooting

### Services not starting after hardening

```bash
# Check UFW allowing necessary ports
sudo ufw status verbose

# Check SSH
sudo sshd -T

# Check fail2ban didn't ban your IP
sudo fail2ban-client status sshd
```

### Database connection fails

```bash
# Check security group allows EC2 to RDS
# Verify database credentials in .env
# Test connection: psql -h rds-endpoint...
```

### Application not responding

```bash
# Check Docker services
docker-compose ps

# View logs
docker-compose logs -f server

# Check port binding
sudo netstat -tulpn | grep 3000

# Check nginx proxy
curl http://localhost:3000  # direct
curl http://your-domain.com  # via nginx
```
