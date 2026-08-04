package com.activityservice.dto;

import com.activityservice.domain.Activity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QrSessionRequest {
    @NotNull(message = "Vui lòng chọn mốc điểm danh cần tạo QR")
    private Activity.AttendanceSession session;

    @Min(value = 1, message = "Thời gian tồn tại QR tối thiểu là 1 phút")
    @Max(value = 240, message = "Thời gian tồn tại QR tối đa là 240 phút")
    private Integer expiresInMinutes = 10;

    private Boolean locationRequired = Boolean.FALSE;

    @DecimalMin(value = "-90.0", message = "Vĩ độ phải nằm trong khoảng -90 đến 90")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải nằm trong khoảng -90 đến 90")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ phải nằm trong khoảng -180 đến 180")
    @DecimalMax(value = "180.0", message = "Kinh độ phải nằm trong khoảng -180 đến 180")
    private Double longitude;

    @DecimalMin(value = "0.0", message = "Sai số vị trí không được âm")
    private Double accuracyMeters;

    @Min(value = 10, message = "Bán kính điểm danh tối thiểu là 10 mét")
    @Max(value = 1000, message = "Bán kính điểm danh tối đa là 1000 mét")
    private Integer allowedRadiusMeters = 100;
}
