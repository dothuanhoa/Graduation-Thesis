package com.certificationservice.dto;

import com.certificationservice.domain.enums.RequestStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.Map;

@Data
public class UpdateStatusDTO {
    
    @NotNull(message = "Trạng thái không được để trống")
    private RequestStatus status;

    private String adminNote;
    private LocalDate appointmentDate;
    private Map<String, Object> metadata;
}
