package com.activityservice.dto;

import com.activityservice.domain.Activity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ActivityRequest {
    @NotBlank(message = "Tên hoạt động không được để trống")
    private String title;

    @NotNull(message = "Phân loại hoạt động không được để trống")
    private Activity.Category category;

    private String reward;

    @NotBlank(message = "Link Google Forms không được để trống")
    private String googleFormUrl;

    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @PositiveOrZero(message = "Số lượng slot không được âm")
    private Integer capacity;
}
