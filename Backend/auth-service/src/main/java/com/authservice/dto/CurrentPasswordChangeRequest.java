package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CurrentPasswordChangeRequest {
    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.")
    @Size(max = 128, message = "Mật khẩu hiện tại không được vượt quá 128 ký tự.")
    private String oldPassword;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
    @Size(min = 6, message = "Mật khẩu mới cần tối thiểu 6 ký tự.")
    @Size(max = 128, message = "Mật khẩu mới không được vượt quá 128 ký tự.")
    private String newPassword;
}
