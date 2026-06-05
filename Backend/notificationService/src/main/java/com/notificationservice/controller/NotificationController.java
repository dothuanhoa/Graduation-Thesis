package com.notificationservice.controller;

import com.notificationservice.domain.Notification;
import com.notificationservice.domain.enums.NotificationCategory;
import com.notificationservice.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications() {
        return ResponseEntity.ok(notificationService.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Notification>> getActiveNotifications() {
        return ResponseEntity.ok(notificationService.findActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Notification> getNotificationById(@PathVariable Long id) {
        return notificationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Notification>> getNotificationsByCategory(@PathVariable NotificationCategory category) {
        return ResponseEntity.ok(notificationService.findByCategory(category));
    }

    @GetMapping("/deadlines")
    public ResponseEntity<List<Notification>> getUpcomingDeadlines() {
        return ResponseEntity.ok(notificationService.findUpcomingDeadlines());
    }

    @PostMapping
    public ResponseEntity<Notification> createNotification(@Valid @RequestBody Notification notification) {
        return ResponseEntity.ok(notificationService.save(notification));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Notification> updateNotification(@PathVariable Long id, @Valid @RequestBody Notification notification) {
        return ResponseEntity.ok(notificationService.update(id, notification));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<Notification> setActive(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(notificationService.setActive(id, active));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
