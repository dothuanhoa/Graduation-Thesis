package com.notificationservice.dto;

import com.notificationservice.domain.Notification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String title;
    private String content;
    private String attachmentUrl;
    private Notification.Priority priority;
    private Notification.TargetType targetType;
    private String targetId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime createdAt;
    private String createdBy;
    private boolean isRead;
}
