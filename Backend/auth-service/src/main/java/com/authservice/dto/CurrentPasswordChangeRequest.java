package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CurrentPasswordChangeRequest {
    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.")
    @Size(max = 64, message = "Mật khẩu hiện tại không được vượt quá 64 ký tự.")
    private String oldPassword;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
    @Size(max = 64, message = "Mật khẩu mới không được vượt quá 64 ký tự.")
    private String newPassword;
}
