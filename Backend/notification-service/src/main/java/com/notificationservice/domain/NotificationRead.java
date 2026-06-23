package com.notificationservice.domain;

import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_reads", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"notification_id", "user_id"})
})
@Data
public class NotificationRead {

    @Id
    @Tsid
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @CreationTimestamp
    @Column(name = "read_at", updatable = false)
    private LocalDateTime readAt;
}
