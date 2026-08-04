package com.activityservice.dto;

import com.activityservice.domain.Activity;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class QrSessionResponse {
    private Activity.AttendanceSession session;
    private String qrCode;
    private String qrPayload;
    private LocalDateTime expiresAt;
    private boolean locationRequired;
    private Double latitude;
    private Double longitude;
    private Double accuracyMeters;
    private Integer allowedRadiusMeters;
}
