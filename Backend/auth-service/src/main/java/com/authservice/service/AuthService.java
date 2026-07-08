package com.authservice.service;

import com.authservice.domain.AuthUser;
import com.authservice.dto.ChangePasswordRequest;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.TokenResponse;
import com.authservice.dto.EmailMessage;
import com.authservice.repository.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RedisService redisService;

    public void internalRegister(String username, String email) {
        if (authUserRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản đã tồn tại");
        }
        String randomPass = UUID.randomUUID().toString().substring(0, 8); // Chuỗi ngẫu nhiên

        AuthUser user = new AuthUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setRole(AuthUser.Role.STUDENT);
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
        
        authUserRepository.save(user);

        // TODO: Gửi email mật khẩu
        System.out.println("Created single account: " + username + " / Password: " + randomPass);
    }

    public TokenResponse login(LoginRequest request) {
        if (redisService.isLockedOut(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau 15 phút.");
        }

        AuthUser user = authUserRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= 5) {
                redisService.lockoutUser(user.getUsername());
            }
            authUserRepository.save(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai tài khoản hoặc mật khẩu");
        }

        // Reset failed attempts
        user.setFailedAttempts(0);
        authUserRepository.save(user);

        if (user.getStatus() == AuthUser.Status.REQUIRE_CHANGE_PWD) {
            // Ném exception để controller catch và trả về HTTP 428 (Precondition Required)
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "REQUIRE_CHANGE_PWD");
        }

        if (user.getStatus() == AuthUser.Status.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa bởi quản trị viên");
        }

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken();
        
        redisService.saveRefreshToken(refreshToken, user.getUsername());

        return new TokenResponse(accessToken, refreshToken);
    }

    public TokenResponse firstChangePassword(ChangePasswordRequest request) {
        AuthUser user = authUserRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));

        if (user.getStatus() != AuthUser.Status.REQUIRE_CHANGE_PWD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản không trong trạng thái bắt buộc đổi mật khẩu");
        }

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Mật khẩu cũ không chính xác");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setStatus(AuthUser.Status.ACTIVE);
        authUserRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken();
        
        redisService.saveRefreshToken(refreshToken, user.getUsername());

        return new TokenResponse(accessToken, refreshToken);
    }

    public void revokeUser(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        // Cập nhật database
        user.setStatus(AuthUser.Status.INACTIVE);
        authUserRepository.save(user);

        // Kích hoạt 2 bước xóa trên Redis
        redisService.revokeAccess(username);
    }

    public void bulkRegister(List<com.authservice.dto.BulkRegisterMessage.UserAccountDTO> accounts) {
        List<AuthUser> users = accounts.stream().map(acc -> {
            AuthUser user = new AuthUser();
            user.setUsername(acc.getUsername());
            user.setEmail(acc.getEmail());
            // Random password
            String randomPwd = UUID.randomUUID().toString().substring(0, 8);
            user.setPasswordHash(passwordEncoder.encode(randomPwd));
            user.setRole(AuthUser.Role.STUDENT);
            user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
            
            // TODO: Gửi email mật khẩu
            System.out.println("Created bulk account: " + acc.getUsername() + " / Password: " + randomPwd);
            return user;
        }).collect(Collectors.toList());

        authUserRepository.saveAll(users);
    }

    public void unlockUser(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));
        
        user.setStatus(AuthUser.Status.ACTIVE);
        user.setFailedAttempts(0);
        authUserRepository.save(user);
        
        // Xóa khỏi Redis lockout nếu có
        redisService.unlockUser(username);
    }

    public void resetPassword(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        String randomPass = UUID.randomUUID().toString().substring(0, 8);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
        user.setFailedAttempts(0);
        authUserRepository.save(user);

        // Kích hoạt xóa session (logout người dùng ngay lập tức)
        redisService.revokeAccess(username);

        // TODO: Gửi email mật khẩu
        System.out.println("Admin reset password for " + username + ". New password: " + randomPass);
    }

    public List<AuthUser> getAllUsers() {
        return authUserRepository.findAll();
    }
}
