package com.certificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FormTypeRequestDTO {
    
    @NotBlank(message = "Tên form không được để trống")
    private String name;
    
    private String description;
    
    private Boolean isActive;
    private String formCode;
}
