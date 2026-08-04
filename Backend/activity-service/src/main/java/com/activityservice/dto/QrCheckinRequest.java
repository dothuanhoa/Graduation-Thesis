package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QrCheckinRequest {
    @NotBlank(message = "Vui lòng quét mã QR điểm danh")
    private String qrCode;

    private Double latitude;

    private Double longitude;

    private Double accuracyMeters;
}
