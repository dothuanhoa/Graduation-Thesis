package com.notificationservice.controller;

import com.notificationservice.domain.Notification;
import com.notificationservice.dto.NotificationRequest;
import com.notificationservice.dto.NotificationResponse;
import com.notificationservice.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    // ----- ADMIN APIs -----
    @PostMapping
    public ResponseEntity<?> createNotification(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestHeader(value = "X-User-Code", defaultValue = "UNKNOWN") String adminId,
            @Valid @RequestBody NotificationRequest request) {
        
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền tạo bảng tin");
        }
        return ResponseEntity.ok(notificationService.createNotification(request, adminId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateNotification(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody NotificationRequest request) {
            
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền sửa bảng tin");
        }
        return ResponseEntity.ok(notificationService.updateNotification(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revokeNotification(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
            
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền thu hồi bảng tin");
        }
        notificationService.revokeNotification(id);
        return ResponseEntity.noContent().build();
    }

    // ----- STUDENT APIs -----
    @GetMapping("/my")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @RequestHeader(value = "X-User-Code", defaultValue = "UNKNOWN") String userId,
            @RequestParam(required = false, defaultValue = "") String facultyId,
            @RequestParam(required = false, defaultValue = "") String classId) {
            
        return ResponseEntity.ok(notificationService.getMyNotifications(userId, facultyId, classId));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader(value = "X-User-Code", defaultValue = "UNKNOWN") String userId,
            @PathVariable Long id) {
            
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }
}
