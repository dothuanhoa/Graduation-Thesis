package com.certificationservice.dto;

import com.certificationservice.domain.enums.RequestStatus;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.Map;

@Data
public class UpdateStatusDTO {
    
    @NotNull(message = "Trạng thái không được để trống")
    private RequestStatus status;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String adminNote;
    @FutureOrPresent(message = "Ngày hẹn trả không được nhỏ hơn ngày hiện tại")
    private LocalDate appointmentDate;
    @Size(max = 100, message = "Dữ liệu bổ sung không được vượt quá 100 mục")
    private Map<String, Object> metadata;
}
