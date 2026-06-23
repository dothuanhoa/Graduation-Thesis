package com.notificationservice.service;

import com.notificationservice.domain.Notification;
import com.notificationservice.domain.NotificationRead;
import com.notificationservice.dto.NotificationRequest;
import com.notificationservice.dto.NotificationResponse;
import com.notificationservice.repository.NotificationReadRepository;
import com.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final NotificationReadRepository notificationReadRepository;

    // Cho Admin
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    public Notification createNotification(NotificationRequest request, String adminId) {
        Notification notification = new Notification();
        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setAttachmentUrl(request.getAttachmentUrl());
        notification.setPriority(request.getPriority());
        notification.setTargetType(request.getTargetType());
        notification.setTargetId(request.getTargetId());
        notification.setStartDate(request.getStartDate());
        notification.setEndDate(request.getEndDate());
        notification.setStatus(request.getStatus());
        notification.setCreatedBy(adminId);
        
        return notificationRepository.save(notification);
    }

    public Notification updateNotification(Long id, NotificationRequest request) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
                
        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setAttachmentUrl(request.getAttachmentUrl());
        notification.setPriority(request.getPriority());
        notification.setTargetType(request.getTargetType());
        notification.setTargetId(request.getTargetId());
        notification.setStartDate(request.getStartDate());
        notification.setEndDate(request.getEndDate());
        notification.setStatus(request.getStatus());
        
        return notificationRepository.save(notification);
    }

    public void revokeNotification(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setStatus(Notification.Status.REVOKED);
        notificationRepository.save(notification);
    }

    // Cho Student
    public List<NotificationResponse> getMyNotifications(String userId, String facultyId, String classId) {
        List<Notification> activeNotifications = notificationRepository.findActiveNotificationsForUser(
                LocalDateTime.now(), facultyId, classId, userId);

        List<Long> notificationIds = activeNotifications.stream().map(Notification::getId).collect(Collectors.toList());
        
        List<Long> readIds = notificationIds.isEmpty() ? List.of() : 
                notificationReadRepository.findReadNotificationIds(userId, notificationIds);

        return activeNotifications.stream().map(n -> NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .content(n.getContent())
                .attachmentUrl(n.getAttachmentUrl())
                .priority(n.getPriority())
                .targetType(n.getTargetType())
                .targetId(n.getTargetId())
                .startDate(n.getStartDate())
                .endDate(n.getEndDate())
                .createdAt(n.getCreatedAt())
                .createdBy(n.getCreatedBy())
                .isRead(readIds.contains(n.getId()))
                .build()).collect(Collectors.toList());
    }

    public void markAsRead(Long notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
                
        if (!notificationReadRepository.existsByNotificationIdAndUserId(notificationId, userId)) {
            NotificationRead read = new NotificationRead();
            read.setNotification(notification);
            read.setUserId(userId);
            notificationReadRepository.save(read);
        }
    }
}
