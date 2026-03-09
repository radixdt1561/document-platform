variable "functions" {
  default = {
    "doc-platform-auth"      = { min = 2, max = 20 }
    "doc-platform-documents" = { min = 2, max = 50 }
    "doc-platform-analytics" = { min = 1, max = 10 }
    "doc-platform-users"     = { min = 1, max = 10 }
    "doc-platform-worker"    = { min = 2, max = 100 }
  }
}

# ── Provisioned Concurrency (keeps warm instances ready) ─────────────────────
resource "aws_lambda_provisioned_concurrency_config" "warm" {
  for_each = var.functions

  function_name                  = each.key
  qualifier                      = "live"
  provisioned_concurrent_executions = each.value.min
}

# ── Application Auto Scaling target per function ──────────────────────────────
resource "aws_appautoscaling_target" "lambda" {
  for_each = var.functions

  max_capacity       = each.value.max
  min_capacity       = each.value.min
  resource_id        = "function:${each.key}:live"
  scalable_dimension = "lambda:function:ProvisionedConcurrency"
  service_namespace  = "lambda"
}

# ── Scale on utilisation > 70% ────────────────────────────────────────────────
resource "aws_appautoscaling_policy" "lambda_utilisation" {
  for_each = var.functions

  name               = "${each.key}-utilisation-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.lambda[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.lambda[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.lambda[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 0.7   # 70% provisioned concurrency utilisation
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "LambdaProvisionedConcurrencyUtilization"
    }
  }
}

# ── CloudWatch Alarms ─────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "throttles" {
  for_each = var.functions

  alarm_name          = "${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Lambda throttles > 10 for 2 minutes on ${each.key}"

  dimensions = {
    FunctionName = each.key
  }
}

resource "aws_cloudwatch_metric_alarm" "errors" {
  for_each = var.functions

  alarm_name          = "${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda errors > 5 for 2 minutes on ${each.key}"

  dimensions = {
    FunctionName = each.key
  }
}

resource "aws_cloudwatch_metric_alarm" "duration_p99" {
  for_each = var.functions

  alarm_name          = "${each.key}-duration-p99"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  extended_statistic  = "p99"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  threshold           = 25000   # 25s — alert before 30s timeout
  alarm_description   = "p99 duration > 25s on ${each.key}"

  dimensions = {
    FunctionName = each.key
  }
}
