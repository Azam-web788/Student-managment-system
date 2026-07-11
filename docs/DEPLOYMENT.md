# Deployment Guide

## AWS Architecture

The application follows a 2-Tier Architecture:

```
Internet → Route53 → CloudFront/ALB → EC2 (Auto Scaling) → RDS PostgreSQL
                                         ↓
                                       S3 (Uploads)
```

## Prerequisites

1. **AWS Account** with admin permissions
2. **AWS CLI** installed and configured
3. **Terraform** v1.5+ installed
4. **Packer** installed
5. **Domain name** (optional, for HTTPS)

## Step 1: Configure GitHub Secrets

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `DB_PASSWORD` | RDS master password |
| `JWT_SECRET` | JWT signing secret |

## Step 2: Deploy Infrastructure with Terraform

### Initialize

```bash
cd terraform
terraform init
```

### Variables

Create a `terraform.tfvars` file:

```hcl
environment     = "production"
instance_type   = "t3.medium"
db_instance_class = "db.t3.medium"
db_name         = "student_management"
db_username     = "postgres"
db_password     = "your-secure-password"
jwt_secret      = "your-jwt-secret"
domain_name     = "students.yourdomain.com"
```

### Plan

```bash
terraform plan -out=tfplan
```

### Apply

```bash
terraform apply tfplan
```

### Important Outputs

After deployment, note these outputs:
- `alb_dns_name` - ALB endpoint
- `rds_endpoint` - Database endpoint
- `s3_bucket_name` - Uploads bucket

## Step 3: Build Custom AMI with Packer

```bash
cd packer
packer init ami.pkr.hcl
packer build ami.pkr.hcl
```

## Step 4: Update Terraform with AMI ID

```hcl
# In terraform.tfvars
ami_id = "ami-xxxxxxxxxxxxx"
```

Apply Terraform again to launch instances with the new AMI.

## Step 5: Configure DNS

1. Point your domain's DNS to the ALB using a CNAME or ALIAS record
2. If using Route53, the Terraform configuration will handle this

## Step 6: Verify Deployment

```bash
# Health check
curl http://<alb-dns>/api/health

# Expected response:
# {"success":true,"message":"Student Management API is running","environment":"production","timestamp":"..."}
```

## Auto Scaling

The Auto Scaling Group is configured with:
- **Min instances**: 1
- **Max instances**: 4
- **Scale up**: CPU > 75% for 2 minutes
- **Scale down**: CPU < 25% for 10 minutes

## Monitoring

Access the CloudWatch Dashboard at:
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=student-management-dashboard

## Backup and Disaster Recovery

### Database Backups
- Automated daily snapshots (7-day retention)
- Final snapshot on deletion
- Multi-AZ deployment for high availability

### S3 Backups
- Cross-region replication (optional)
- Lifecycle rules to transition to Glacier

## Updating the Application

### Via CI/CD
Push to the `main` branch to trigger the GitHub Actions pipeline.

### Manual Update
1. Build new AMI with Packer
2. Update the launch template
3. Start instance refresh in the Auto Scaling Group

## Troubleshooting

### EC2 Instance Not Healthy
1. Check CloudWatch logs
2. SSH into the instance (via SSM or bastion)
3. Check PM2 process: `pm2 list`
4. Check application logs: `/opt/student-management/backend/logs/combined.log`
5. Verify .env file exists and has correct values

### Database Connection Issues
1. Verify security group allows traffic from EC2 to RDS
2. Check RDS is in the same VPC
3. Verify credentials in .env file

### ALB Returning 503
1. Check target group health checks
2. Verify EC2 instances are registered and healthy
3. Check security group rules on EC2
