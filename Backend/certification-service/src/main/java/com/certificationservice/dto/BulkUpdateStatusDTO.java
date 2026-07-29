package com.certificationservice.dto;

import com.certificationservice.domain.enums.RequestStatus;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class BulkUpdateStatusDTO {

    @NotEmpty(message = "Vui lòng chọn ít nhất một đơn")
    @Size(max = 500, message = "Không được cập nhật quá 500 đơn mỗi lần")
    private List<@NotNull(message = "Mã đơn không được để trống") @Positive(message = "Mã đơn không hợp lệ") Long> requestIds;

    private RequestStatus status;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String adminNote;

    @FutureOrPresent(message = "Ngày hẹn trả không được nhỏ hơn ngày hiện tại")
    private LocalDate appointmentDate;

    @Size(max = 100, message = "Dữ liệu bổ sung không được vượt quá 100 mục")
    private Map<String, Object> metadata;
}
