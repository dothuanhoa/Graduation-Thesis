package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CheckinRequest {
    @NotBlank(message = "MSSV quét được không được để trống")
    @Size(max = 50, message = "MSSV không được vượt quá 50 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "MSSV không hợp lệ")
    private String studentCode;
}
