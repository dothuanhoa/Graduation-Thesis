package com.activityservice.dto;

import com.activityservice.domain.Activity;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ActivityRequest {
    @NotBlank(message = "Tên hoạt động không được để trống")
    @Size(min = 3, max = 255, message = "Tên hoạt động phải từ 3 đến 255 ký tự")
    private String title;

    @NotNull(message = "Phân loại hoạt động không được để trống")
    private Activity.Category category;

    @NotBlank(message = "Điểm rèn luyện không được để trống")
    @Size(max = 100, message = "Điểm rèn luyện không được vượt quá 100 ký tự")
    private String reward;

    @NotNull(message = "Hình thức tham gia không được để trống")
    private Activity.ParticipationType participationType = Activity.ParticipationType.LIMITED;

    @Size(max = 500, message = "Link Google Form không được vượt quá 500 ký tự")
    @Pattern(regexp = "^$|^https?://.+", message = "Link Google Form phải bắt đầu bằng http:// hoặc https://")
    private String googleFormUrl;

    private LocalDateTime registrationStartTime;

    private LocalDateTime registrationEndTime;

    @NotBlank(message = "Địa điểm không được để trống")
    @Size(max = 255, message = "Địa điểm không được vượt quá 255 ký tự")
    private String location;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private LocalDateTime endTime;

    @Positive(message = "Số lượng tối đa phải lớn hơn 0")
    private Integer capacity;

    @AssertTrue(message = "Hoạt động giới hạn cần có thời gian mở đăng ký")
    public boolean isRegistrationStartTimeRequiredForLimitedActivity() {
        return participationType != Activity.ParticipationType.LIMITED || registrationStartTime != null;
    }

    @AssertTrue(message = "Hoạt động giới hạn cần có thời gian đóng đăng ký")
    public boolean isRegistrationEndTimeRequiredForLimitedActivity() {
        return participationType != Activity.ParticipationType.LIMITED || registrationEndTime != null;
    }

    @AssertTrue(message = "Hoạt động giới hạn cần có số lượng tối đa")
    public boolean isCapacityRequiredForLimitedActivity() {
        return participationType != Activity.ParticipationType.LIMITED || capacity != null;
    }

    @AssertTrue(message = "Thời gian kết thúc phải sau thời gian bắt đầu")
    public boolean isTimeRangeValid() {
        return startTime == null || endTime == null || endTime.isAfter(startTime);
    }

    @AssertTrue(message = "Thời gian đóng đăng ký phải sau thời gian mở đăng ký")
    public boolean isRegistrationTimeRangeValid() {
        if (participationType != Activity.ParticipationType.LIMITED) {
            return true;
        }
        return registrationStartTime == null || registrationEndTime == null || registrationEndTime.isAfter(registrationStartTime);
    }

    @AssertTrue(message = "Thời gian đóng đăng ký không được sau thời gian bắt đầu hoạt động")
    public boolean isRegistrationEndBeforeActivityStart() {
        if (participationType != Activity.ParticipationType.LIMITED) {
            return true;
        }
        return registrationEndTime == null || startTime == null || !registrationEndTime.isAfter(startTime);
    }
}
