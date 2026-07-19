package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetForgotPasswordRequest {
    @NotBlank(message = "Liên kết đặt lại mật khẩu không hợp lệ.")
    private String token;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
    @Size(min = 6, message = "Mật khẩu mới cần tối thiểu 6 ký tự.")
    private String newPassword;
}
