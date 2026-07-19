package com.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CurrentPasswordChangeRequest {
    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.")
    private String oldPassword;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
    @Size(min = 6, message = "Mật khẩu mới cần tối thiểu 6 ký tự.")
    private String newPassword;
}
