package com.certificationservice.dto;

import com.certificationservice.domain.enums.RequestStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class BulkUpdateStatusDTO {

    @NotEmpty(message = "Vui lòng chọn ít nhất một đơn")
    private List<@NotNull(message = "Mã đơn không được để trống") Long> requestIds;

    private RequestStatus status;
    private String adminNote;
    private LocalDate appointmentDate;
    private Map<String, Object> metadata;
}
