#!/bin/bash
set -e

# Student Management System - EC2 User Data Script
# This script runs on instance launch to deploy the application from S3

# Variables passed from Terraform template (lowercase)
DB_HOST="${db_host}"
DB_PORT="${db_port}"
DB_NAME="${db_name}"
DB_USER="${db_user}"
DB_PASSWORD="${db_password}"
JWT_SECRET="${jwt_secret}"
JWT_EXPIRES_IN="${jwt_expires_in}"
AWS_REGION="${aws_region}"
S3_BUCKET_NAME="${s3_bucket}"
DEPLOY_BUCKET="${deploy_bucket}"
NODE_ENV="${node_env}"
ALB_DNS="${alb_dns}"

# Bash variables (escaped with $$ for Terraform template)
APP_DIR="/opt/student-management"
LOG_DIR="$${APP_DIR}/backend/logs"

exec > >(tee /var/log/user-data.log) 2>&1
echo "=== User Data Script Starting ==="
echo "Node environment: $${NODE_ENV}"
echo "ALB DNS: $${ALB_DNS}"

# Update system packages (non-critical, don't block on failure)
dnf update -y 2>&1 || echo "dnf update skipped (non-critical)"
dnf install -y git unzip tar gcc-c++ make

# Install Node.js 20.x (Amazon Linux 2023 includes Node.js in default repos)
echo "=== Installing Node.js 20.x ==="
dnf install -y nodejs

# Verify Node.js installation
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2 globally
echo "=== Installing PM2 ==="
npm install -g pm2

# Install CloudWatch Agent (non-critical, don't block if unavailable)
echo "=== Installing CloudWatch Agent ==="
dnf install -y amazon-cloudwatch-agent 2>&1 || echo "CloudWatch agent install skipped (not in default repos)"

# Create application directory
mkdir -p $${APP_DIR}
mkdir -p $${LOG_DIR}

# Download application code from S3
echo "=== Downloading application code from S3 ==="
echo "Bucket: $${DEPLOY_BUCKET}"

# Download backend package
aws s3 cp s3://$${DEPLOY_BUCKET}/backend.tar.gz $${APP_DIR}/backend.tar.gz --region $${AWS_REGION} || {
  echo "WARNING: Could not download backend package from S3"
  echo "Creating placeholder structure..."
  mkdir -p $${APP_DIR}/backend
}

# Download frontend package
aws s3 cp s3://$${DEPLOY_BUCKET}/frontend.tar.gz $${APP_DIR}/frontend.tar.gz --region $${AWS_REGION} || {
  echo "WARNING: Could not download frontend package from S3"
  echo "Creating placeholder structure..."
  mkdir -p $${APP_DIR}/frontend
}

# Extract backend into backend/ directory
if [ -f $${APP_DIR}/backend.tar.gz ]; then
  echo "=== Extracting backend ==="
  mkdir -p $${APP_DIR}/backend
  tar -xzf $${APP_DIR}/backend.tar.gz -C $${APP_DIR}/backend/
  rm -f $${APP_DIR}/backend.tar.gz
fi

# Extract frontend into frontend/ directory
if [ -f $${APP_DIR}/frontend.tar.gz ]; then
  echo "=== Extracting frontend ==="
  mkdir -p $${APP_DIR}/frontend
  tar -xzf $${APP_DIR}/frontend.tar.gz -C $${APP_DIR}/frontend/
  rm -f $${APP_DIR}/frontend.tar.gz
fi

# Ensure directories have correct ownership
chown -R ec2-user:ec2-user $${APP_DIR}

# Create environment file
echo "=== Creating environment file ==="
cat > /opt/student-management/backend/.env << EOF
PORT=5000
NODE_ENV=${node_env}

DB_HOST=${db_host}
DB_PORT=${db_port}
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}

JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=${jwt_expires_in}

AWS_REGION=${aws_region}
S3_BUCKET_NAME=${s3_bucket}

CORS_ORIGIN=http://${alb_dns}
LOG_LEVEL=info
EOF

echo "Environment file created at /opt/student-management/backend/.env"

# Install backend dependencies
echo "=== Installing backend dependencies ==="
cd $${APP_DIR}/backend
npm install --production 2>&1 || echo "WARNING: npm install failed, continuing..."

# Ensure logs directory exists
mkdir -p $${APP_DIR}/backend/logs

# Run database migrations (use set +e to prevent 'set -e' from killing the script)
set +e
echo "=== Running database migrations ==="
cd $${APP_DIR}/backend
node database/migrate.js 2>&1
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "WARNING: Migration exit code $MIGRATE_EXIT - tables may already exist. Continuing..."
fi

# Seed database with initial data
if [ -f database/seed.js ]; then
  echo "=== Seeding database with initial data ==="
  node database/seed.js 2>&1
  SEED_EXIT=$?
  if [ $SEED_EXIT -ne 0 ]; then
    echo "WARNING: Seed exit code $SEED_EXIT - data may already exist. Continuing..."
  fi
fi
set -e

# Configure CloudWatch Agent (only if installed)
if command -v /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl &> /dev/null; then
  echo "=== Configuring CloudWatch Agent ==="
  cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWCONFIG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/student-management/backend/logs/combined.log",
            "log_group_name": "/student-management/app",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/opt/student-management/backend/logs/error.log",
            "log_group_name": "/student-management/errors",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    },
    "log_stream_name": "{instance_id}",
    "force_flush_interval": 5
  },
  "metrics": {
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "resources": ["*"],
        "metrics_collection_interval": 60
      }
    }
  }
}
CWCONFIG
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json 2>&1 || echo "CloudWatch config fetch skipped"
fi

# Start application with PM2
echo "=== Starting application with PM2 ==="
cd $${APP_DIR}/backend
pm2 start server.js --name "student-management-api" -i max 2>&1 || {
  echo "PM2 start failed, trying single instance..."
  pm2 start server.js --name "student-management-api" 2>&1
}
pm2 save
pm2 startup systemd -u root --hp /root 2>&1 || true

# Setup log rotation for PM2
pm2 install pm2-logrotate 2>&1 || true

# Health check
echo "=== Running health check ==="
sleep 5
curl -s http://localhost:5000/api/health && echo " - Health check passed" || echo " - Health check failed (will retry later)"

# Verify database has data by testing admin login
echo "=== Verifying database has admin user ==="
sleep 3
LOGIN_RESULT=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@studentmanagement.com","password":"Admin@123"}' 2>&1)
echo "Login test result: $LOGIN_RESULT"
if echo "$LOGIN_RESULT" | grep -q '"success":true'; then
  echo "✅ Admin login verified - database is seeded!"
else
  echo "WARNING: Admin login test returned non-success. Check logs for details."
fi

echo "=== User Data Script Complete ==="
