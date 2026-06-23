package com.notificationservice.repository;

import com.notificationservice.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n " +
           "WHERE n.status = 'PUBLISHED' " +
           "AND n.startDate <= :now " +
           "AND n.endDate >= :now " +
           "AND (" +
           "  n.targetType = 'ALL' " +
           "  OR (n.targetType = 'FACULTY' AND n.targetId = :facultyId) " +
           "  OR (n.targetType = 'CLASS' AND n.targetId = :classId) " +
           "  OR (n.targetType = 'USER' AND n.targetId = :userId)" +
           ") " +
           "ORDER BY n.priority DESC, n.startDate DESC")
    List<Notification> findActiveNotificationsForUser(
            @Param("now") LocalDateTime now,
            @Param("facultyId") String facultyId,
            @Param("classId") String classId,
            @Param("userId") String userId
    );
}
