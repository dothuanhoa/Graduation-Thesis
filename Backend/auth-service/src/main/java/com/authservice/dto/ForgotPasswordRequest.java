package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "Vui lòng nhập MSSV hoặc email.")
    @Size(max = 50, message = "MSSV hoặc email không được vượt quá 50 ký tự.")
    private String usernameOrEmail;
}
