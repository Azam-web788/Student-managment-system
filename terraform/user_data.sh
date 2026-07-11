#!/bin/bash
set -e

# Student Management System - EC2 User Data Script
# This script runs on instance launch to configure the application

# Variables passed from Terraform template
DB_HOST="${db_host}"
DB_PORT="${db_port}"
DB_NAME="${db_name}"
DB_USER="${db_user}"
DB_PASSWORD="${db_password}"
JWT_SECRET="${jwt_secret}"
JWT_EXPIRES_IN="${jwt_expires_in}"
AWS_REGION="${aws_region}"
S3_BUCKET="${s3_bucket}"
NODE_ENV="${node_env}"
ALB_DNS="${alb_dns}"

# Update system packages
yum update -y
yum install -y curl wget git

# Install Node.js 20.x
curl -sL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create application directory
mkdir -p /opt/student-management
cd /opt/student-management

# Clone or copy application code
# In production, this would be from S3 or CodeCommit
# For Packer-built AMI, the code is already baked in

# Create environment file
cat > /opt/student-management/backend/.env << EOF
PORT=5000
NODE_ENV=${NODE_ENV}

DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}

AWS_REGION=${AWS_REGION}
S3_BUCKET_NAME=${S3_BUCKET}

CORS_ORIGIN=https://${ALB_DNS}
LOG_LEVEL=info
EOF

# Install backend dependencies
cd /opt/student-management/backend
npm install --production

# Run database migrations
node database/migrate.js || echo "Migration may have already been applied"

# Start application with PM2
pm2 start server.js --name "student-management-api" -i max
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Setup log rotation for PM2
pm2 install pm2-logrotate

# Configure CloudWatch agent (if installed)
if command -v /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl &> /dev/null; then
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

  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
fi

# Configure Nginx as reverse proxy (optional)
# yum install -y nginx
# cat > /etc/nginx/conf.d/student-management.conf << 'NGINX'
# server {
#     listen 80;
#     server_name _;
#
#     location / {
#         proxy_pass http://localhost:5000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#     }
# }
# NGINX
# systemctl enable nginx
# systemctl start nginx

# Health check endpoint
curl -s http://localhost:5000/api/health && echo "Health check passed" || echo "Health check failed"

echo "Student Management System deployment complete"
