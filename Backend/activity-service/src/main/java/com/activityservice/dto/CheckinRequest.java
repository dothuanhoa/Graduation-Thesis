package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckinRequest {
    @NotBlank(message = "MSSV quét được không được để trống")
    private String studentCode;
}
