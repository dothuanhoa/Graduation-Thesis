package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "Vui lòng nhập MSSV hoặc email.")
    private String usernameOrEmail;
}
