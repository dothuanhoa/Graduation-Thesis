package com.notificationservice.dto;

import com.notificationservice.domain.Notification;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationRequest {
    @NotBlank(message = "Tiêu đề thông báo không được để trống")
    @Size(min = 3, max = 255, message = "Tiêu đề thông báo phải từ 3 đến 255 ký tự")
    private String title;

    @NotBlank(message = "Nội dung thông báo không được để trống")
    @Size(max = 5000, message = "Nội dung thông báo không được vượt quá 5000 ký tự")
    private String content;

    @Size(max = 500, message = "Đường dẫn tệp đính kèm không được vượt quá 500 ký tự")
    private String attachmentUrl;

    @NotNull(message = "Mức độ ưu tiên không được để trống")
    private Notification.Priority priority;

    @NotNull(message = "Đối tượng nhận không được để trống")
    private Notification.TargetType targetType;

    @Size(max = 50, message = "Mã đối tượng không được vượt quá 50 ký tự")
    private String targetId;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDateTime startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDateTime endDate;

    @NotNull(message = "Trạng thái thông báo không được để trống")
    private Notification.Status status;

    @AssertTrue(message = "Hệ thống không hỗ trợ gửi thông báo theo từng USER")
    public boolean isUserTargetUnsupported() {
        return targetType != Notification.TargetType.USER;
    }

    @AssertTrue(message = "Mã đối tượng không được để trống khi gửi theo khoa hoặc lớp")
    public boolean isTargetIdRequiredWhenScoped() {
        return targetType == null
                || targetType == Notification.TargetType.ALL
                || (targetId != null && !targetId.trim().isEmpty());
    }

    @AssertTrue(message = "Ngày kết thúc phải sau ngày bắt đầu")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || endDate.isAfter(startDate);
    }
}
