package com.certificationservice.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

@Data
public class FormTypeDTO {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;
    
    @NotBlank(message = "Tên form không được để trống")
    private String name;
    
    private String formCode;
    
    private String description;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
