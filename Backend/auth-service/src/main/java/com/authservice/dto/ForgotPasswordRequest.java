package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "Vui lòng nhập MSSV hoặc email.")
    @Size(max = 100, message = "MSSV hoặc email không được vượt quá 100 ký tự.")
    private String usernameOrEmail;
}
