variable "services" {
  default = ["auth-service", "document-service", "analytics-service", "user-service", "worker-service"]
}

# ── ECS Cluster ──────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "document-platform"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── Auto Scaling — one target per service ────────────────────────────────────
resource "aws_appautoscaling_target" "ecs" {
  for_each = toset(var.services)

  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${each.key}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale OUT — CPU > 70%
resource "aws_appautoscaling_policy" "cpu_scale_out" {
  for_each = toset(var.services)

  name               = "${each.key}-cpu-scale-out"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# Scale OUT — Memory > 75%
resource "aws_appautoscaling_policy" "memory_scale_out" {
  for_each = toset(var.services)

  name               = "${each.key}-memory-scale-out"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 75.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}

# ── CloudWatch Alarms ─────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  for_each = toset(var.services)

  alarm_name          = "${each.key}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "CPU > 85% for 2 minutes on ${each.key}"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = each.key
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  for_each = toset(var.services)

  alarm_name          = "${each.key}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Memory > 85% for 2 minutes on ${each.key}"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = each.key
  }
}
