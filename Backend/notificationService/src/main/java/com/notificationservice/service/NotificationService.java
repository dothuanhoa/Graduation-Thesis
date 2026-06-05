package com.notificationservice.service;

import com.notificationservice.domain.Notification;
import com.notificationservice.domain.enums.NotificationCategory;

import java.util.List;
import java.util.Optional;

public interface NotificationService {
    List<Notification> findAll();

    Optional<Notification> findById(long id);

    List<Notification> findActive();

    List<Notification> findByCategory(NotificationCategory category);

    List<Notification> findUpcomingDeadlines();

    Notification save(Notification notification);

    Notification update(long id, Notification notification);

    Notification setActive(long id, boolean active);

    void delete(long id);
}
