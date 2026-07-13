package com.authservice.service;

import com.authservice.domain.AuthUser;
import com.authservice.dto.ChangePasswordRequest;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.TokenResponse;
import com.authservice.repository.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
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
            System.out.println("Account already exists, skip creating: " + username);
            return;
        }

        String randomPass = UUID.randomUUID().toString().substring(0, 8);

        AuthUser user = new AuthUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setRole(AuthUser.Role.STUDENT);
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);

        authUserRepository.save(user);
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
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai mật khẩu");
        }

        user.setFailedAttempts(0);
        authUserRepository.save(user);

        if (user.getStatus() == AuthUser.Status.REQUIRE_CHANGE_PWD) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "REQUIRE_CHANGE_PWD");
        }

        if (user.getStatus() == AuthUser.Status.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa bởi quản trị viên");
        }

        redisService.clearRevokedAccess(user.getUsername());

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

        redisService.clearRevokedAccess(user.getUsername());

        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken();

        redisService.saveRefreshToken(refreshToken, user.getUsername());

        return new TokenResponse(accessToken, refreshToken);
    }

    public void revokeUser(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        user.setStatus(AuthUser.Status.INACTIVE);
        authUserRepository.save(user);
        redisService.revokeAccess(username);
    }

    public void bulkRegister(List<com.authservice.dto.BulkRegisterMessage.UserAccountDTO> accounts) {
        Map<String, com.authservice.dto.BulkRegisterMessage.UserAccountDTO> uniqueAccounts = accounts.stream()
                .filter(account -> account.getUsername() != null && !account.getUsername().isBlank())
                .collect(Collectors.toMap(
                        account -> account.getUsername().trim(),
                        account -> account,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        Set<String> existingUsernames = authUserRepository.findByUsernameIn(uniqueAccounts.keySet())
                .stream()
                .map(AuthUser::getUsername)
                .collect(Collectors.toSet());

        List<AuthUser> users = uniqueAccounts.values().stream()
                .filter(account -> !existingUsernames.contains(account.getUsername().trim()))
                .map(account -> {
                    String randomPwd = UUID.randomUUID().toString().substring(0, 8);
                    AuthUser user = new AuthUser();
                    user.setUsername(account.getUsername().trim());
                    user.setEmail(account.getEmail());
                    user.setPasswordHash(passwordEncoder.encode(randomPwd));
                    user.setRole(AuthUser.Role.STUDENT);
                    user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
                    return user;
                })
                .collect(Collectors.toList());

        authUserRepository.saveAll(users);
        System.out.println("Created bulk accounts: " + users.size() + "/" + uniqueAccounts.size());
    }

    public void unlockUser(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        user.setStatus(AuthUser.Status.ACTIVE);
        user.setFailedAttempts(0);
        authUserRepository.save(user);

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

        redisService.revokeAccess(username);
        System.out.println("Admin reset password for " + username + ". New password: " + randomPass);
    }

    public List<AuthUser> getAllUsers() {
        return authUserRepository.findAll();
    }
}
