package com.notificationservice.service;

import com.notificationservice.client.UserClient;
import com.notificationservice.domain.Notification;
import com.notificationservice.domain.NotificationRead;
import com.notificationservice.dto.NotificationRequest;
import com.notificationservice.dto.NotificationResponse;
import com.notificationservice.dto.UserProfileDTO;
import com.notificationservice.repository.NotificationReadRepository;
import com.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final NotificationReadRepository notificationReadRepository;
    private final UserClient userClient;

    // Cho Admin
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    public Notification createNotification(NotificationRequest request, String adminId) {
        normalizeAndValidateTarget(request);
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
        normalizeAndValidateTarget(request);
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
    public List<NotificationResponse> getMyNotifications(String userId) {
        StudentNotificationScope scope = resolveStudentScope(userId);
        List<Notification> activeNotifications = notificationRepository.findActiveNotificationsForUser(
                LocalDateTime.now(), scope.facultyCode(), scope.classCode());

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
        boolean visibleToStudent = getMyNotifications(userId).stream()
                .anyMatch(notification -> notification.getId().equals(notificationId));
        if (!visibleToStudent) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền đọc thông báo này");
        }

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
                
        if (!notificationReadRepository.existsByNotificationIdAndUserId(notificationId, userId)) {
            NotificationRead read = new NotificationRead();
            read.setNotification(notification);
            read.setUserId(userId);
            notificationReadRepository.save(read);
        }
    }

    private void normalizeAndValidateTarget(NotificationRequest request) {
        if (request.getTargetType() == Notification.TargetType.USER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hệ thống không còn hỗ trợ gửi thông báo theo từng USER");
        }

        if (request.getTargetType() == Notification.TargetType.ALL) {
            request.setTargetId(null);
            return;
        }

        String targetId = normalizeTargetId(request.getTargetId());
        if (targetId == null || targetId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập Mã đối tượng");
        }
        request.setTargetId(targetId);
    }

    private String normalizeTargetId(String value) {
        return value == null ? "" : value.trim();
    }

    private StudentNotificationScope resolveStudentScope(String userId) {
        if (!StringUtils.hasText(userId) || "UNKNOWN".equalsIgnoreCase(userId.trim())) {
            return new StudentNotificationScope("", "");
        }

        try {
            UserProfileDTO profile = userClient.getStudentProfile("SYSTEM", "notification-service", userId.trim());
            UserProfileDTO.ClazzDTO clazz = profile == null ? null : profile.getClazz();
            UserProfileDTO.FacultyDTO faculty = clazz == null ? null : clazz.getFaculty();
            String facultyCode = normalizeTargetId(faculty == null ? "" : faculty.getFacultyCode());
            String classCode = normalizeTargetId(clazz == null ? "" : clazz.getClassCode());
            return new StudentNotificationScope(facultyCode, classCode);
        } catch (Exception ex) {
            return new StudentNotificationScope("", "");
        }
    }

    private record StudentNotificationScope(String facultyCode, String classCode) {
    }
}
