package com.authservice.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username; // MSSV
    private String email;
}
