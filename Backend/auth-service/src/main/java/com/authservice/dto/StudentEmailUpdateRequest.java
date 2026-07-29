package com.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StudentEmailUpdateRequest {
    @Email(message = "Email không hợp lệ.")
    @Size(max = 50, message = "Email không được vượt quá 50 ký tự.")
    private String email;
}
