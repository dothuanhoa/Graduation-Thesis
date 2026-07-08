package com.certificationservice.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Data
public class FormTypeDTO {
    private Long id;
    
    @NotBlank(message = "Tên form không được để trống")
    private String name;
    
    private String description;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
