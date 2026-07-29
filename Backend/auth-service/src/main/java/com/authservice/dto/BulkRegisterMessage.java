package com.authservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkRegisterMessage {
    private List<@Valid UserAccountDTO> accounts;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserAccountDTO {
        @NotBlank(message = "Tên đăng nhập không được để trống.")
        @Size(max = 30, message = "Tên đăng nhập không được vượt quá 30 ký tự.")
        @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.")
        private String username;

        @Email(message = "Email không hợp lệ.")
        @Size(max = 50, message = "Email không được vượt quá 50 ký tự.")
        private String email;
    }
}
