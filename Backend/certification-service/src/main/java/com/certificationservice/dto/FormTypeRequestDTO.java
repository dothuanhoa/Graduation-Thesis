package com.certificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FormTypeRequestDTO {
    
    @NotBlank(message = "Tên form không được để trống")
    @Size(min = 2, max = 200, message = "Tên form phải từ 2 đến 200 ký tự")
    private String name;
    
    @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
    private String description;
    
    private Boolean isActive;
    @NotNull(message = "Mã form không được để trống")
    @Size(max = 50, message = "Mã form không được vượt quá 50 ký tự")
    @Pattern(regexp = "^$|^[A-Z0-9_-]+$", message = "Mã form chỉ gồm chữ in hoa, số, gạch dưới hoặc gạch ngang")
    private String formCode;
}
