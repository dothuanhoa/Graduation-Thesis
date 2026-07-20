package com.notificationservice.service;

import com.notificationservice.domain.Notification;
import com.notificationservice.domain.NotificationRead;
import com.notificationservice.dto.NotificationRequest;
import com.notificationservice.client.UserClient;
import com.notificationservice.repository.NotificationReadRepository;
import com.notificationservice.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationReadRepository notificationReadRepository;
    @Mock private UserClient userClient;

    @Test
    void createNotificationPreservesRichHtmlContent() {
        NotificationService service = new NotificationService(notificationRepository, notificationReadRepository, userClient);
        NotificationRequest request = new NotificationRequest();
        request.setTitle("Thong bao");
        request.setContent("<p><strong>Noi dung co dinh dang</strong></p>");
        request.setPriority(Notification.Priority.URGENT);
        request.setTargetType(Notification.TargetType.ALL);
        request.setStartDate(LocalDateTime.now().minusMinutes(1));
        request.setEndDate(LocalDateTime.now().plusDays(1));
        request.setStatus(Notification.Status.PUBLISHED);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification saved = service.createNotification(request, "admin");

        assertThat(saved.getContent()).isEqualTo("<p><strong>Noi dung co dinh dang</strong></p>");
        assertThat(saved.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    void markAsReadIsIdempotent() {
        NotificationService service = new NotificationService(notificationRepository, notificationReadRepository, userClient);
        Notification notification = new Notification();
        notification.setId(99L);
        notification.setTitle("Thong bao");
        notification.setContent("<p>Noi dung</p>");
        notification.setPriority(Notification.Priority.NORMAL);
        notification.setTargetType(Notification.TargetType.ALL);
        notification.setStartDate(LocalDateTime.now().minusDays(1));
        notification.setEndDate(LocalDateTime.now().plusDays(1));
        notification.setCreatedBy("admin");
        when(notificationRepository.findActiveNotificationsForUser(any(LocalDateTime.class), any(), any()))
                .thenReturn(List.of(notification));
        when(notificationReadRepository.findReadNotificationIds("DH52201258", List.of(99L))).thenReturn(List.of());
        when(notificationRepository.findById(99L)).thenReturn(Optional.of(notification));
        when(notificationReadRepository.existsByNotificationIdAndUserId(99L, "DH52201258")).thenReturn(false, true);

        service.markAsRead(99L, "DH52201258");
        service.markAsRead(99L, "DH52201258");

        ArgumentCaptor<NotificationRead> readCaptor = ArgumentCaptor.forClass(NotificationRead.class);
        verify(notificationReadRepository).save(readCaptor.capture());
        assertThat(readCaptor.getValue().getNotification()).isSameAs(notification);
        assertThat(readCaptor.getValue().getUserId()).isEqualTo("DH52201258");
    }

    @Test
    void getMyNotificationsMapsReadState() {
        NotificationService service = new NotificationService(notificationRepository, notificationReadRepository, userClient);
        Notification notification = new Notification();
        notification.setId(100L);
        notification.setTitle("Thong bao");
        notification.setContent("<p>Noi dung</p>");
        notification.setPriority(Notification.Priority.NORMAL);
        notification.setTargetType(Notification.TargetType.ALL);
        notification.setStartDate(LocalDateTime.now().minusDays(1));
        notification.setEndDate(LocalDateTime.now().plusDays(1));
        notification.setCreatedBy("admin");

        when(notificationRepository.findActiveNotificationsForUser(any(LocalDateTime.class), any(), any()))
                .thenReturn(List.of(notification));
        when(notificationReadRepository.findReadNotificationIds("DH52201258", List.of(100L))).thenReturn(List.of(100L));

        var response = service.getMyNotifications("DH52201258");

        assertThat(response).hasSize(1);
        assertThat(response.get(0).isRead()).isTrue();
        assertThat(response.get(0).getContent()).isEqualTo("<p>Noi dung</p>");
        verify(notificationReadRepository, never()).save(any());
    }
}
