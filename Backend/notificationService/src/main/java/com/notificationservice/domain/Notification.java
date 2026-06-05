package com.notificationservice.domain;

import com.notificationservice.domain.enums.NotificationCategory;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @NotBlank(message = "Tieu de thong bao khong duoc de trong")
    private String title;

    @NotBlank(message = "Noi dung thong bao khong duoc de trong")
    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private NotificationCategory category = NotificationCategory.GENERAL;

    private String location;

    private String actionUrl;

    private boolean pinned = false;

    private boolean active = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    private LocalDateTime deadlineAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
