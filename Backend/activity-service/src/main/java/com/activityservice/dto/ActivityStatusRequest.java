package com.activityservice.dto;

import com.activityservice.domain.Activity;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ActivityStatusRequest {
    @NotNull(message = "Trạng thái hoạt động không được để trống")
    private Activity.Status status;
}
