# Packer configuration for Student Management System AMI
# Builds a custom Amazon Machine Image with pre-installed dependencies

packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "source_ami" {
  type    = string
  default = "amzn2-ami-hvm-*-x86_64-gp2"
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "ssh_username" {
  type    = string
  default = "ec2-user"
}

variable "app_version" {
  type    = string
  default = "1.0.0"
}

# Source AMI configuration
source "amazon-ebs" "student-management" {
  region              = var.aws_region
  source_ami_filter {
    filters = {
      name                = var.source_ami
      root-device-type    = "ebs"
      virtualization-type = "hvm"
      architecture        = "x86_64"
    }
    most_recent = true
    owners      = ["amazon"]
  }

  instance_type          = var.instance_type
  ssh_username           = var.ssh_username
  ami_name               = "student-management-ami-${var.app_version}-{{timestamp}}"
  ami_description        = "Student Management System AMI - v${var.app_version}"
  ami_virtualization_type = "hvm"

  launch_block_device_mappings {
    device_name           = "/dev/xvda"
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name        = "student-management-ami-${var.app_version}"
    Version     = var.app_version
    Project     = "StudentManagementSystem"
    ManagedBy   = "Packer"
    Environment = "production"
  }

  run_tags = {
    Name    = "packer-builder-${var.app_version}"
    Project = "StudentManagementSystem"
  }
}

# Provisioning steps
build {
  sources = ["source.amazon-ebs.student-management"]

  # Update system packages
  provisioner "shell" {
    inline = [
      "sudo yum update -y",
      "sudo yum install -y curl wget git gcc-c++ make",
    ]
  }

  # Install Node.js 20.x
  provisioner "shell" {
    inline = [
      "curl -sL https://rpm.nodesource.com/setup_20.x | sudo bash -",
      "sudo yum install -y nodejs",
      "node --version",
      "npm --version",
    ]
  }

  # Install PM2 globally
  provisioner "shell" {
    inline = [
      "sudo npm install -g pm2",
      "pm2 --version",
    ]
  }

  # Create application directories
  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/student-management/{backend,frontend}",
      "sudo chown -R ec2-user:ec2-user /opt/student-management",
    ]
  }

  # Copy backend application files
  provisioner "file" {
    source      = "../backend"
    destination = "/opt/student-management/backend"
  }

  # Copy frontend application files
  provisioner "file" {
    source      = "../frontend"
    destination = "/opt/student-management/frontend"
  }

  # Install backend dependencies
  provisioner "shell" {
    inline = [
      "cd /opt/student-management/backend",
      "npm install --production",
    ]
  }

  # Build frontend
  provisioner "shell" {
    inline = [
      "cd /opt/student-management/frontend",
      "npm install",
      "npm run build",
    ]
  }

  # Create logs directory
  provisioner "shell" {
    inline = [
      "mkdir -p /opt/student-management/backend/logs",
      "echo 'AMI built at {{timestamp}}' | sudo tee /opt/student-management/ami-info.txt",
    ]
  }

  # Clean up
  provisioner "shell" {
    inline = [
      "sudo yum clean all",
      "sudo rm -rf /var/cache/yum",
      "npm cache clean --force",
      "sudo rm -rf /opt/student-management/frontend/node_modules",
      "sudo rm -rf /opt/student-management/backend/node_modules",
    ]
  }

  # Install CloudWatch agent
  provisioner "shell" {
    inline = [
      "sudo yum install -y amazon-cloudwatch-agent",
    ]
  }

  # Final verification
  provisioner "shell" {
    inline = [
      "echo '=== AMI Build Summary ==='",
      "echo 'Node.js version:'",
      "node --version",
      "echo 'NPM version:'",
      "npm --version",
      "echo 'PM2 version:'",
      "pm2 --version",
      "echo 'Build completed successfully'",
    ]
  }
}
