# ACM Certificate (only if domain is provided)
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-cert"
  }
}

# DNS validation records (only if Route53 zone exists)
resource "aws_route53_record" "cert_validation" {
  count = var.domain_name != "" && var.ssl_certificate_arn == "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = aws_acm_certificate.main[0].domain_validation_options[0].resource_record_name
  type    = aws_acm_certificate.main[0].domain_validation_options[0].resource_record_type
  records = [aws_acm_certificate.main[0].domain_validation_options[0].resource_record_value]
  ttl     = 60
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" && var.ssl_certificate_arn == "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [aws_route53_record.cert_validation[0].fqdn]
}

# Data source for Route53 zone (if domain provided)
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0

  name         = var.domain_name
  private_zone = false
}
