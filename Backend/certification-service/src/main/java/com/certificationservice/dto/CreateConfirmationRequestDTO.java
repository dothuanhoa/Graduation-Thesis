package com.certificationservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.Map;

@Data
public class CreateConfirmationRequestDTO {
    
    @NotNull(message = "Form Type ID không được để trống")
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long formTypeId;

    private String reason;
    private String contactPhone;
    private String proofFileUrl;
    private String semester;
    private Map<String, Object> metadata;
}
