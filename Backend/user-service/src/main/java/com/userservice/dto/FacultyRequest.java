package com.userservice.dto;

import com.userservice.domain.Faculty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FacultyRequest {
    @NotBlank(message = "Mã khoa không được để trống")
    @Size(min = 2, max = 20, message = "Mã khoa phải từ 2 đến 20 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Mã khoa chỉ gồm chữ, số, gạch dưới hoặc gạch ngang")
    private String facultyCode;

    @NotBlank(message = "Tên khoa không được để trống")
    @Size(min = 2, max = 255, message = "Tên khoa phải từ 2 đến 255 ký tự")
    private String facultyName;

    @NotNull(message = "Trạng thái khoa không được để trống")
    private Faculty.Status status = Faculty.Status.ACTIVE;
}
