package com.authservice.controller;

import com.authservice.dto.ChangePasswordRequest;
import com.authservice.dto.CurrentPasswordChangeRequest;
import com.authservice.dto.ForgotPasswordRequest;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.RegisterRequest;
import com.authservice.dto.ResetForgotPasswordRequest;
import com.authservice.dto.TokenResponse;
import com.authservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final Duration REFRESH_TOKEN_MAX_AGE = Duration.ofDays(7);

    private final AuthService authService;

    @Value("${app.auth.refresh-cookie.secure:false}")
    private boolean refreshCookieSecure;

    @Value("${app.auth.refresh-cookie.same-site:Lax}")
    private String refreshCookieSameSite;

    // API này sau này sẽ bị giới hạn chỉ cho nội bộ gọi (từ user-service)
    @PostMapping("/internal/register")
    public ResponseEntity<String> register(
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail,
            @RequestBody RegisterRequest request
    ) {
        authService.internalRegister(request.getUsername(), request.getEmail(), sendMail);
        return ResponseEntity.ok("Khởi tạo tài khoản thành công!");
    }

    @PostMapping("/internal/bulk-register")
    public ResponseEntity<String> bulkRegister(
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail,
            @RequestBody java.util.List<com.authservice.dto.BulkRegisterMessage.UserAccountDTO> accounts) {
        authService.bulkRegister(accounts, sendMail);
        return ResponseEntity.ok("Import thành công!");
    }

    @PostMapping("/internal/email/{username}")
    public ResponseEntity<String> updateStudentEmail(
            @RequestHeader("X-User-Role") String role,
            @PathVariable String username,
            @RequestBody RegisterRequest request
    ) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
        authService.updateStudentEmail(username, request.getEmail());
        return ResponseEntity.ok("Đã cập nhật email tài khoản thành công!");
    }

    @DeleteMapping("/internal/account/{username}")
    public ResponseEntity<String> deleteStudentAccount(
            @RequestHeader("X-User-Role") String role,
            @PathVariable String username
    ) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
        int deletedCount = authService.deleteStudentAccounts(List.of(username));
        return ResponseEntity.ok("Đã xóa " + deletedCount + " tài khoản sinh viên.");
    }

    @PostMapping("/internal/accounts/delete")
    public ResponseEntity<String> deleteStudentAccounts(
            @RequestHeader("X-User-Role") String role,
            @RequestBody List<String> usernames
    ) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
        int deletedCount = authService.deleteStudentAccounts(usernames);
        return ResponseEntity.ok("Đã xóa " + deletedCount + " tài khoản sinh viên.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            TokenResponse token = authService.login(request);
            return withRefreshCookie(token);
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
        return withRefreshCookie(authService.firstChangePassword(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken
    ) {
        return withRefreshCookie(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.getUsernameOrEmail());
        return ResponseEntity.ok(Map.of(
                "message",
                "Nếu thông tin hợp lệ, hệ thống đã gửi email hướng dẫn đặt lại mật khẩu."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetForgotPassword(@Valid @RequestBody ResetForgotPasswordRequest request) {
        authService.resetForgotPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody CurrentPasswordChangeRequest request
    ) {
        authService.changeCurrentPassword(authorizationHeader, request.getOldPassword(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới."));
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

    private ResponseEntity<TokenResponse> withRefreshCookie(TokenResponse token) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(token.getRefreshToken()).toString())
                .body(new TokenResponse(token.getAccessToken(), null));
    }

    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/api/auth")
                .maxAge(REFRESH_TOKEN_MAX_AGE)
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();
    }
}
