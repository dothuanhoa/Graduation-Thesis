package com.notificationservice.repository;

import com.notificationservice.domain.Notification;
import com.notificationservice.domain.enums.NotificationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByOrderByPinnedDescCreatedAtDesc();

    List<Notification> findByActiveTrueOrderByPinnedDescCreatedAtDesc();

    List<Notification> findByCategoryAndActiveTrueOrderByPinnedDescCreatedAtDesc(NotificationCategory category);

    List<Notification> findByDeadlineAtAfterAndActiveTrueOrderByDeadlineAtAsc(LocalDateTime now);
}
