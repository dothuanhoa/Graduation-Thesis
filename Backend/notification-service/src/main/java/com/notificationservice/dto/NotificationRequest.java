package com.notificationservice.dto;

import com.notificationservice.domain.Notification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationRequest {
    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private String attachmentUrl;

    @NotNull(message = "Priority is required")
    private Notification.Priority priority;

    @NotNull(message = "Target type is required")
    private Notification.TargetType targetType;

    private String targetId;

    @NotNull(message = "Start date is required")
    private LocalDateTime startDate;

    @NotNull(message = "End date is required")
    private LocalDateTime endDate;

    @NotNull(message = "Status is required")
    private Notification.Status status;
}
