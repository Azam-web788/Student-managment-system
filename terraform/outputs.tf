output "vpc_id" {
  description = "The VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "The zone ID of the ALB"
  value       = aws_lb.main.zone_id
}

output "rds_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_address" {
  description = "The RDS instance address"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "s3_bucket_name" {
  description = "The S3 bucket name for uploads"
  value       = aws_s3_bucket.uploads.id
}

output "autoscaling_group_name" {
  description = "The Auto Scaling Group name"
  value       = aws_autoscaling_group.main.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.app.name
}

output "security_group_ids" {
  description = "Map of security group IDs"
  value = {
    alb         = aws_security_group.alb.id
    ec2         = aws_security_group.ec2.id
    rds         = aws_security_group.rds.id
  }
}

output "kms_key_id" {
  description = "The KMS key ID"
  value       = aws_kms_key.main.key_id
}

output "deploy_bucket_name" {
  description = "The S3 bucket name for deployment code"
  value       = data.aws_s3_bucket.deployment.id
}

output "ssh_private_key" {
  description = "SSH private key for EC2 instances"
  value       = tls_private_key.main.private_key_pem
  sensitive   = true
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC authentication"
  value       = aws_iam_role.github_actions.arn
}

output "github_actions_role_name" {
  description = "IAM role name for GitHub Actions OIDC authentication"
  value       = aws_iam_role.github_actions.name
}
