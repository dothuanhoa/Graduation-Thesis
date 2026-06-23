package com.notificationservice.repository;

import com.notificationservice.domain.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {
    
    @Query("SELECT nr.notification.id FROM NotificationRead nr WHERE nr.userId = :userId AND nr.notification.id IN :notificationIds")
    List<Long> findReadNotificationIds(@Param("userId") String userId, @Param("notificationIds") List<Long> notificationIds);

    boolean existsByNotificationIdAndUserId(Long notificationId, String userId);
}
