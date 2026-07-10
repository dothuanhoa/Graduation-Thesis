package com.activityservice.dto;

import com.activityservice.domain.Activity;
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

    @NotBlank(message = "Link Google Form không được để trống")
    @Size(max = 500, message = "Link Google Form không được vượt quá 500 ký tự")
    @Pattern(regexp = "^https?://.+", message = "Link Google Form phải bắt đầu bằng http:// hoặc https://")
    private String googleFormUrl;

    @NotBlank(message = "Địa điểm không được để trống")
    @Size(max = 255, message = "Địa điểm không được vượt quá 255 ký tự")
    private String location;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private LocalDateTime endTime;

    @NotNull(message = "Số lượng tối đa không được để trống")
    @Positive(message = "Số lượng tối đa phải lớn hơn 0")
    private Integer capacity;
}
