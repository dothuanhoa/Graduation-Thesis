package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetForgotPasswordRequest {
    @NotBlank(message = "Liên kết đặt lại mật khẩu không hợp lệ.")
    @Size(max = 200, message = "Token đặt lại mật khẩu không hợp lệ.")
    private String token;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
    @Size(max = 64, message = "Mật khẩu mới không được vượt quá 64 ký tự.")
    private String newPassword;
}
