package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Vui lòng nhập tên đăng nhập.")
    @Size(max = 50, message = "Tên đăng nhập không được vượt quá 50 ký tự.")
    private String username;

    @NotBlank(message = "Vui lòng nhập mật khẩu.")
    @Size(max = 64, message = "Mật khẩu không được vượt quá 64 ký tự.")
    private String password;
}
