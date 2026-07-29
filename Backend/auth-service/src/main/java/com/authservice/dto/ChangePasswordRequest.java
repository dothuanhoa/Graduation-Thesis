package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "Vui lòng nhập tên đăng nhập.")
    @Size(max = 50, message = "Tên đăng nhập không được vượt quá 50 ký tự.")
    private String username;

    @NotBlank(message = "Vui lòng nhập mật khẩu cũ.")
    @Size(max = 64, message = "Mật khẩu cũ không được vượt quá 64 ký tự.")
    private String oldPassword;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
    @Size(min = 6, max = 64, message = "Mật khẩu mới phải từ 6 đến 64 ký tự.")
    private String newPassword;
}
