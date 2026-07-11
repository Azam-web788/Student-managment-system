# Packer Guide

## Overview

Packer builds a custom Amazon Machine Image (AMI) with all dependencies pre-installed for faster EC2 instance launches.

## Prerequisites

- Packer 1.9+
- AWS credentials configured
- Source AMI: Amazon Linux 2

## What's Included in the AMI

- Node.js 20.x
- npm 10.x
- PM2 process manager
- Application source code
- CloudWatch agent
- Security updates

## Building the AMI

### Initialize

```bash
cd packer
packer init ami.pkr.hcl
```

### Build

```bash
packer build \
  -var "aws_region=us-east-1" \
  -var "app_version=1.0.0" \
  ami.pkr.hcl
```

### Build with Custom Source AMI

```bash
packer build \
  -var "source_ami=ami-xxxxxxxx" \
  -var "instance_type=t3.large" \
  ami.pkr.hcl
```

## Output

After successful build, Packer outputs:
```
==> Builds finished. The artifacts of successful builds are:
--> amazon-ebs.student-management: AMIs were created:
us-east-1: ami-xxxxxxxxxxxxxxxxx
```

## Integration with Terraform

Update your Terraform variables with the new AMI ID:

```hcl
ami_id = "ami-xxxxxxxxxxxxxxxxx"
```

## CI/CD Integration

The GitHub Actions workflow automatically builds a new AMI on every push to the main branch.

## Best Practices

1. **Version your AMIs** using the `app_version` variable
2. **Test AMIs** in staging before production
3. **Minimize size** by cleaning package caches
4. **Use immutable infrastructure** - never SSH into instances, rebuild AMIs instead
