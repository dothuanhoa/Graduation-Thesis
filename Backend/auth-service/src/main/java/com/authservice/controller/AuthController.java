package com.authservice.controller;

import com.authservice.dto.ChangePasswordRequest;
import com.authservice.dto.CurrentPasswordChangeRequest;
import com.authservice.dto.ForgotPasswordRequest;
import com.authservice.dto.BulkRegisterMessage.UserAccountDTO;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.RegisterRequest;
import com.authservice.dto.ResetForgotPasswordRequest;
import com.authservice.dto.StudentEmailUpdateRequest;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_SYSTEM = "SYSTEM";
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_.-]+$");

    private final AuthService authService;

    @Value("${app.auth.refresh-cookie.secure:false}")
    private boolean refreshCookieSecure;

    @Value("${app.auth.refresh-cookie.same-site:Lax}")
    private String refreshCookieSameSite;

    @Value("${app.auth.refresh-token-ttl-days:7}")
    private long refreshTokenTtlDays;

    @Value("${app.internal.secret:dev-local-internal-secret}")
    private String internalServiceSecret;

    @Value("${app.gateway.secret:dev-local-gateway-secret}")
    private String gatewaySecret;

    // API này sau này sẽ bị giới hạn chỉ cho nội bộ gọi (từ user-service)
    @PostMapping("/internal/register")
    public ResponseEntity<String> register(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail,
            @Valid @RequestBody RegisterRequest request
    ) {
        if (!isInternalRequest(internalSecret) || !isAdminOrSystem(role)) {
            return forbidden();
        }
        authService.internalRegister(request.getUsername(), request.getEmail(), sendMail);
        return ResponseEntity.ok("Khởi tạo tài khoản thành công!");
    }

    @PostMapping("/internal/bulk-register")
    public ResponseEntity<String> bulkRegister(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail,
            @Valid @RequestBody List<@Valid UserAccountDTO> accounts) {
        if (!isInternalRequest(internalSecret) || !isAdminOrSystem(role)) {
            return forbidden();
        }
        if (accounts == null || accounts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách tài khoản không được để trống");
        }
        authService.bulkRegister(accounts, sendMail);
        return ResponseEntity.ok("Import thành công!");
    }

    @PostMapping("/internal/email/{username}")
    public ResponseEntity<String> updateStudentEmail(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @PathVariable String username,
            @Valid @RequestBody StudentEmailUpdateRequest request
    ) {
        if (!isInternalRequest(internalSecret) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        authService.updateStudentEmail(username, request.getEmail());
        return ResponseEntity.ok("Đã cập nhật email tài khoản thành công!");
    }

    @DeleteMapping("/internal/account/{username}")
    public ResponseEntity<String> deleteStudentAccount(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @PathVariable String username
    ) {
        if (!isInternalRequest(internalSecret) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        int deletedCount = authService.deleteStudentAccounts(List.of(username));
        return ResponseEntity.ok("Đã xóa " + deletedCount + " tài khoản sinh viên.");
    }

    @PostMapping("/internal/accounts/delete")
    public ResponseEntity<String> deleteStudentAccounts(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @RequestBody List<String> usernames
    ) {
        if (!isInternalRequest(internalSecret) || !isAdmin(role)) return forbidden();
        if (usernames == null || usernames.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách tài khoản không được để trống");
        }
        validateUsernameList(usernames);
        int deletedCount = authService.deleteStudentAccounts(usernames);
        return ResponseEntity.ok("Đã xóa " + deletedCount + " tài khoản sinh viên.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
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
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                Map<String, String> response = new HashMap<>();
                response.put("code", "ACCOUNT_TEMPORARILY_LOCKED");
                response.put("message", e.getReason() == null || e.getReason().isBlank()
                        ? "Tài khoản bị khóa. Vui lòng thử lại sau 15 phút."
                        : e.getReason());
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
            }
            throw e;
        }
    }

    @PostMapping("/first-change-password")
    public ResponseEntity<TokenResponse> firstChangePassword(@Valid @RequestBody ChangePasswordRequest request) {
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
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @CookieValue(value = REFRESH_TOKEN_COOKIE, required = false) String refreshToken
    ) {
        authService.logout(refreshToken, authorizationHeader);
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

    // API dành cho Admin qua Gateway
    @PostMapping("/admin/revoke/{username}")
    public ResponseEntity<String> adminRevokeAccess(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Gateway-Secret", defaultValue = "") String gatewaySecretHeader,
            @PathVariable String username
    ) {
        if (!isGatewayRequest(gatewaySecretHeader) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        authService.revokeUser(username);
        return ResponseEntity.ok("Đã khóa tài khoản thành công");
    }

    @PostMapping("/admin/unlock/{username}")
    public ResponseEntity<String> adminUnlockAccess(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Gateway-Secret", defaultValue = "") String gatewaySecretHeader,
            @PathVariable String username
    ) {
        if (!isGatewayRequest(gatewaySecretHeader) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        authService.unlockUser(username);
        return ResponseEntity.ok("Đã mở khóa tài khoản thành công");
    }

    @PostMapping("/admin/reset-password/{username}")
    public ResponseEntity<String> adminResetPassword(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Gateway-Secret", defaultValue = "") String gatewaySecretHeader,
            @PathVariable String username
    ) {
        if (!isGatewayRequest(gatewaySecretHeader) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        authService.resetPassword(username);
        return ResponseEntity.ok("Đã reset mật khẩu thành công. Vui lòng check mail để xem mật khẩu mới.");
    }

    // API nội bộ dành cho service-to-service
    @PostMapping("/internal/revoke/{username}")
    public ResponseEntity<String> revokeAccess(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @PathVariable String username
    ) {
        if (!isInternalRequest(internalSecret) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        authService.revokeUser(username);
        return ResponseEntity.ok("Đã khóa tài khoản thành công");
    }

    @PostMapping("/internal/unlock/{username}")
    public ResponseEntity<String> unlockAccess(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @PathVariable String username
    ) {
        if (!isInternalRequest(internalSecret) || !isAdmin(role)) return forbidden();
        validateUsername(username);
        authService.unlockUser(username);
        return ResponseEntity.ok("Đã mở khóa tài khoản thành công");
    }

    @PostMapping("/internal/reset-password/{username}")
    public ResponseEntity<String> resetPassword(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value = "X-Internal-Secret", defaultValue = "") String internalSecret,
            @PathVariable String username
    ) {
        if (!isInternalRequest(internalSecret) || !isAdmin(role)) return forbidden();
        validateUsername(username);
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
                .maxAge(Duration.ofDays(Math.max(1, refreshTokenTtlDays)))
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

    private boolean isAdminOrSystem(String role) {
        String normalizedRole = normalizeRole(role);
        return ROLE_ADMIN.equals(normalizedRole) || ROLE_SYSTEM.equals(normalizedRole);
    }

    private boolean isAdmin(String role) {
        return ROLE_ADMIN.equals(normalizeRole(role));
    }

    private boolean isInternalRequest(String providedSecret) {
        return secretMatches(internalServiceSecret, providedSecret);
    }

    private boolean isGatewayRequest(String providedSecret) {
        return secretMatches(gatewaySecret, providedSecret);
    }

    private boolean secretMatches(String expectedSecret, String providedSecret) {
        if (expectedSecret == null || expectedSecret.isBlank()
                || providedSecret == null || providedSecret.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                expectedSecret.getBytes(StandardCharsets.UTF_8),
                providedSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "";
        }
        String normalizedRole = role.trim().toUpperCase();
        if (normalizedRole.startsWith("ROLE_")) {
            normalizedRole = normalizedRole.substring("ROLE_".length());
        }
        return normalizedRole;
    }

    private void validateUsernameList(List<String> usernames) {
        for (String username : usernames) {
            validateUsername(username);
        }
    }

    private void validateUsername(String username) {
        if (username == null || username.isBlank() || username.length() > 50
                || !USERNAME_PATTERN.matcher(username.trim()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập không hợp lệ");
        }
    }

    private ResponseEntity<String> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ Admin mới có quyền này");
    }
}
