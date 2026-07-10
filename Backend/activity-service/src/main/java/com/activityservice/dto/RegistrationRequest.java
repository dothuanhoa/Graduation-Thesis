package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegistrationRequest {
    @NotBlank(message = "MSSV không được để trống")
    @Size(max = 50, message = "MSSV không được vượt quá 50 ký tự")
    private String studentCode;

    @NotBlank(message = "Họ tên sinh viên không được để trống")
    @Size(min = 2, max = 100, message = "Họ tên sinh viên phải từ 2 đến 100 ký tự")
    private String fullName;
}
