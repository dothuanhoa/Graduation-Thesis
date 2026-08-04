package com.activityservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FaceVerificationAdjustmentRequest {
    @NotNull(message = "Vui lòng chọn kết quả xác thực khuôn mặt")
    private Boolean faceVerified;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String note;
}
