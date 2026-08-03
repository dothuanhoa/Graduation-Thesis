package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QrCheckinRequest {
    @NotBlank(message = "Vui l?ng qu?t ho?c nh?p m? QR ?i?m danh")
    private String qrCode;
}
