package com.authservice.controller;

import com.authservice.dto.ChangePasswordRequest;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.RegisterRequest;
import com.authservice.dto.TokenResponse;
import com.authservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    // API này sau này sẽ bị giới hạn chỉ cho nội bộ gọi (từ user-service)
    @PostMapping("/internal/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        authService.internalRegister(request.getUsername(), request.getEmail());
        return ResponseEntity.ok("Khởi tạo tài khoản thành công!");
    }

    @PostMapping("/internal/bulk-register")
    public ResponseEntity<String> bulkRegister(@RequestBody java.util.List<com.authservice.dto.BulkRegisterMessage.UserAccountDTO> accounts) {
        authService.bulkRegister(accounts);
        return ResponseEntity.ok("Import thành công!");
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody LoginRequest request) {
        try {
            TokenResponse token = authService.login(request);
            return ResponseEntity.ok(token);
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.PRECONDITION_REQUIRED) {
                Map<String, String> response = new HashMap<>();
                response.put("code", "REQUIRE_CHANGE_PWD");
                response.put("message", "Bạn phải đổi mật khẩu lần đầu");
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED).body(response);
            }
            throw e;
        }
    }

    @PostMapping("/first-change-password")
    public ResponseEntity<TokenResponse> firstChangePassword(@RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(authService.firstChangePassword(request));
    }

    // API dành cho Admin
    @PostMapping("/internal/revoke/{username}")
    public ResponseEntity<String> revokeAccess(@RequestHeader("X-User-Role") String role, @PathVariable String username) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
        authService.revokeUser(username);
        return ResponseEntity.ok("Đã khóa tài khoản thành công");
    }

    @PostMapping("/internal/unlock/{username}")
    public ResponseEntity<String> unlockAccess(@RequestHeader("X-User-Role") String role, @PathVariable String username) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
        authService.unlockUser(username);
        return ResponseEntity.ok("Đã mở khóa tài khoản thành công");
    }

    @PostMapping("/internal/reset-password/{username}")
    public ResponseEntity<String> resetPassword(@RequestHeader("X-User-Role") String role, @PathVariable String username) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
        authService.resetPassword(username);
        return ResponseEntity.ok("Đã reset mật khẩu thành công. Vui lòng check mail để xem mật khẩu mới.");
    }
}
