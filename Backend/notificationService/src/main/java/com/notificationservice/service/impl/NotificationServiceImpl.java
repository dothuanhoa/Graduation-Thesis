package com.notificationservice.service.impl;

import com.notificationservice.domain.Notification;
import com.notificationservice.domain.enums.NotificationCategory;
import com.notificationservice.exception.ResourceNotFoundException;
import com.notificationservice.repository.NotificationRepository;
import com.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;

    public List<Notification> findAll() {
        return notificationRepository.findAllByOrderByPinnedDescCreatedAtDesc();
    }

    public Optional<Notification> findById(long id) {
        return notificationRepository.findById(id);
    }

    public List<Notification> findActive() {
        return notificationRepository.findByActiveTrueOrderByPinnedDescCreatedAtDesc();
    }

    public List<Notification> findByCategory(NotificationCategory category) {
        return notificationRepository.findByCategoryAndActiveTrueOrderByPinnedDescCreatedAtDesc(category);
    }

    public List<Notification> findUpcomingDeadlines() {
        return notificationRepository.findByDeadlineAtAfterAndActiveTrueOrderByDeadlineAtAsc(LocalDateTime.now());
    }

    public Notification save(Notification notification) {
        return notificationRepository.save(notification);
    }

    public Notification update(long id, Notification notificationDetails) {
        return notificationRepository.findById(id).map(notification -> {
            notification.setTitle(notificationDetails.getTitle());
            notification.setContent(notificationDetails.getContent());
            notification.setCategory(notificationDetails.getCategory());
            notification.setLocation(notificationDetails.getLocation());
            notification.setActionUrl(notificationDetails.getActionUrl());
            notification.setPinned(notificationDetails.isPinned());
            notification.setActive(notificationDetails.isActive());
            notification.setStartAt(notificationDetails.getStartAt());
            notification.setEndAt(notificationDetails.getEndAt());
            notification.setDeadlineAt(notificationDetails.getDeadlineAt());
            return notificationRepository.save(notification);
        }).orElseThrow(() -> new ResourceNotFoundException("Khong tim thay thong bao voi id: " + id));
    }

    public Notification setActive(long id, boolean active) {
        return notificationRepository.findById(id).map(notification -> {
            notification.setActive(active);
            return notificationRepository.save(notification);
        }).orElseThrow(() -> new ResourceNotFoundException("Khong tim thay thong bao voi id: " + id));
    }

    public void delete(long id) {
        if (!notificationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Khong tim thay thong bao voi id: " + id);
        }
        notificationRepository.deleteById(id);
    }
}
