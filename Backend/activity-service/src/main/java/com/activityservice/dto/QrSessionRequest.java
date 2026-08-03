package com.activityservice.dto;

import com.activityservice.domain.Activity;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QrSessionRequest {
    @NotNull(message = "Vui l?ng ch?n m?c ?i?m danh c?n t?o QR")
    private Activity.AttendanceSession session;

    @Min(value = 1, message = "Th?i gian t?n t?i QR t?i thi?u l? 1 ph?t")
    @Max(value = 240, message = "Th?i gian t?n t?i QR t?i ?a l? 240 ph?t")
    private Integer expiresInMinutes = 10;
}
