# Terraform Usage Guide

## Overview

Terraform manages all AWS infrastructure for the Student Management System. The configuration follows a modular, reusable approach.

## Prerequisites

- Terraform v1.5+
- AWS CLI configured with appropriate credentials
- An S3 bucket for remote state storage (recommended)

## Project Structure

```
terraform/
├── provider.tf       # AWS provider configuration
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── networking.tf     # VPC, subnets, routing
├── security.tf       # Security groups
├── alb.tf            # Application Load Balancer
├── ec2.tf            # EC2 launch template & Auto Scaling
├── rds.tf            # RDS PostgreSQL
├── s3.tf             # S3 buckets
├── acm.tf            # SSL certificates
├── route53.tf        # DNS records
├── kms.tf            # Encryption keys
├── cloudwatch.tf     # Monitoring and logging
└── user_data.sh      # EC2 initialization script
```

## Remote State Storage (Recommended)

Create an S3 bucket for state storage:

```bash
aws s3 mb s3://student-management-terraform-state
```

Configure backend in `provider.tf`:

```hcl
terraform {
  backend "s3" {
    bucket = "student-management-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}
```

## Variables

Create a `terraform.tfvars` file:

```hcl
environment       = "production"
aws_region        = "us-east-1"
instance_type     = "t3.medium"
desired_capacity  = 2
min_size          = 1
max_size          = 4
db_instance_class = "db.t3.medium"
db_name           = "student_management"
db_username       = "postgres"
db_password       = "your-secure-password-here"
jwt_secret        = "your-jwt-secret-here"
domain_name       = "students.yourdomain.com"
log_retention_days = 30
```

## Commands

### Initialize
```bash
terraform init
```

### Format Code
```bash
terraform fmt
```

### Validate
```bash
terraform validate
```

### Plan
```bash
terraform plan -out=tfplan
```

### Apply
```bash
terraform apply tfplan
```

### Destroy
```bash
terraform destroy
```

## Outputs

After apply, get output values:

```bash
terraform output alb_dns_name
terraform output rds_endpoint
terraform output s3_bucket_name
```

## Module Usage

Create a `modules/` directory for reusable components:

```hcl
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]
  availability_zones   = ["us-east-1a", "us-east-1b"]
}
```

## Best Practices

1. **State Locking** - Use DynamoDB for state locking
2. **Environment Separation** - Use workspaces or separate directories
3. **Secrets Management** - Use AWS Secrets Manager for sensitive values
4. **Tagging** - All resources are tagged for cost allocation
5. **Encryption** - All data is encrypted at rest and in transit
