package com.userservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AcademicYearRequest {
    @NotBlank(message = "Tên niên khóa không được để trống")
    @Size(min = 3, max = 50, message = "Tên niên khóa phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[\\p{L}\\p{N}\\s._/-]+$", message = "Tên niên khóa chỉ gồm chữ, số, khoảng trắng, dấu chấm, gạch dưới, gạch ngang hoặc dấu /")
    private String yearName;

    @NotNull(message = "Năm bắt đầu không được để trống")
    @Min(value = 1900, message = "Năm bắt đầu không hợp lệ")
    @Max(value = 2100, message = "Năm bắt đầu không hợp lệ")
    private Integer startYear;
}
