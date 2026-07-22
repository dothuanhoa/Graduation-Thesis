package com.authservice.service;

import com.authservice.domain.AuthUser;
import com.authservice.domain.PasswordResetToken;
import com.authservice.dto.ChangePasswordRequest;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.TokenResponse;
import com.authservice.repository.AuthUserRepository;
import com.authservice.repository.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final ZoneId PASSWORD_RESET_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AuthUserRepository authUserRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RedisService redisService;
    private final AccountEmailService accountEmailService;

    @Value("${app.student.email-domain:student.edu.vn}")
    private String studentEmailDomain;

    @Value("${app.auth.password-reset.url:http://localhost:5173/reset-password}")
    private String passwordResetUrl;

    @Value("${app.auth.password-reset.token-ttl-minutes:30}")
    private long passwordResetTokenTtlMinutes;

    @Value("${app.auth.password-reset.monthly-limit:2}")
    private int passwordResetMonthlyLimit;

    public void internalRegister(String username, String email) {
        internalRegister(username, email, true);
    }

    public void internalRegister(String username, String email, boolean sendMail) {
        String cleanUsername = username == null ? "" : username.trim();
        if (cleanUsername.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập không được để trống");
        }

        String accountEmail = resolveEmailForInternalRegister(email, cleanUsername);
        AuthUser existingUser = authUserRepository.findByUsername(cleanUsername).orElse(null);
        if (existingUser != null) {
            if (existingUser.getRole() == AuthUser.Role.ADMIN) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên đăng nhập đã thuộc tài khoản quản trị");
            }

            if (existingUser.getStatus() == AuthUser.Status.REQUIRE_CHANGE_PWD) {
                issueTemporaryPassword(existingUser, accountEmail, sendMail);
                System.out.println("Re-issued temporary password for student account: " + cleanUsername
                        + ", send mail: " + sendMail);
                return;
            }

            if (!sameEmail(existingUser.getEmail(), accountEmail)) {
                existingUser.setEmail(accountEmail);
                authUserRepository.save(existingUser);
            }
            System.out.println("Student account already initialized, skipped password reset for: " + cleanUsername);
            return;
        }

        String randomPass = generateTemporaryPassword();

        AuthUser user = new AuthUser();
        user.setUsername(cleanUsername);
        user.setEmail(accountEmail);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setRole(AuthUser.Role.STUDENT);
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);

        authUserRepository.save(user);
        if (sendMail) {
            accountEmailService.sendInitialPasswordEmail(accountEmail, cleanUsername, randomPass);
        }
        System.out.println("Created single account: " + cleanUsername + ", send mail: " + sendMail);
    }

    @Transactional
    public void updateStudentEmail(String username, String email) {
        String cleanUsername = username == null ? "" : username.trim();
        if (cleanUsername.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập không được để trống");
        }

        AuthUser user = authUserRepository.findByUsername(cleanUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));
        if (user.getRole() == AuthUser.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể cập nhật email sinh viên cho tài khoản quản trị");
        }

        String accountEmail = resolveEmailForInternalRegister(email, cleanUsername);
        if (sameEmail(user.getEmail(), accountEmail)) {
            return;
        }

        user.setEmail(accountEmail);
        authUserRepository.save(user);
        System.out.println("Updated student auth email for: " + cleanUsername + " -> " + accountEmail);
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

        user.setFailedAttempts(0);
        authUserRepository.save(user);

        if (user.getStatus() == AuthUser.Status.REQUIRE_CHANGE_PWD) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "REQUIRE_CHANGE_PWD");
        }

        if (user.getStatus() == AuthUser.Status.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa bởi quản trị viên");
        }

        redisService.clearRevokedAccess(user.getUsername());

        return issueTokens(user);
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

        return issueTokens(user);
    }

    public TokenResponse refresh(String refreshToken) {
        String username = redisService.findUserIdByRefreshToken(refreshToken);
        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn");
        }

        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn"));

        if (user.getStatus() != AuthUser.Status.ACTIVE) {
            redisService.revokeAccess(username);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn");
        }

        redisService.deleteRefreshToken(refreshToken);
        redisService.clearRevokedAccess(username);
        return issueTokens(user);
    }

    public void logout(String refreshToken) {
        redisService.deleteRefreshToken(refreshToken);
    }

    @Transactional
    public void requestPasswordReset(String usernameOrEmail) {
        String lookup = usernameOrEmail == null ? "" : usernameOrEmail.trim();
        if (lookup.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập MSSV hoặc email.");
        }

        AuthUser user = findUserByUsernameOrEmail(lookup);
        if (user == null) {
            return;
        }

        if (user.getStatus() == AuthUser.Status.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa, vui lòng liên hệ Phòng Công tác sinh viên.");
        }

        Instant now = Instant.now();
        LocalDate firstDayOfMonth = LocalDate.now(PASSWORD_RESET_ZONE).withDayOfMonth(1);
        Instant monthStart = firstDayOfMonth.atStartOfDay(PASSWORD_RESET_ZONE).toInstant();
        Instant nextMonthStart = firstDayOfMonth.plusMonths(1).atStartOfDay(PASSWORD_RESET_ZONE).toInstant();
        int monthlyLimit = Math.max(1, passwordResetMonthlyLimit);
        long requestCount = passwordResetTokenRepository.countByUserAndCreatedAtBetween(user, monthStart, nextMonthStart);
        if (requestCount >= monthlyLimit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Bạn chỉ có thể yêu cầu quên mật khẩu tối đa " + monthlyLimit + " lần trong một tháng.");
        }

        expireOutstandingResetTokens(user, now);

        long ttlMinutes = Math.max(1, passwordResetTokenTtlMinutes);
        String rawToken = generateSecureToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(hashToken(rawToken));
        resetToken.setExpiresAt(now.plus(Duration.ofMinutes(ttlMinutes)));
        passwordResetTokenRepository.save(resetToken);

        accountEmailService.sendForgotPasswordEmail(user.getEmail(), user.getUsername(), buildPasswordResetLink(rawToken), ttlMinutes);
    }

    @Transactional
    public void resetForgotPassword(String token, String newPassword) {
        String cleanToken = token == null ? "" : token.trim();
        if (cleanToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu không hợp lệ.");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới cần tối thiểu 6 ký tự.");
        }

        Instant now = Instant.now();
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hashToken(cleanToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."));

        if (resetToken.getUsedAt() != null || resetToken.getExpiresAt().isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        AuthUser user = resetToken.getUser();
        if (user.getStatus() == AuthUser.Status.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa, vui lòng liên hệ Phòng Công tác sinh viên.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setStatus(AuthUser.Status.ACTIVE);
        user.setFailedAttempts(0);
        authUserRepository.save(user);

        expireOutstandingResetTokens(user, now);
        resetToken.setUsedAt(now);

        redisService.unlockUser(user.getUsername());
        redisService.revokeAccess(user.getUsername());
    }

    @Transactional
    public void changeCurrentPassword(String authorizationHeader, String oldPassword, String newPassword) {
        String username = jwtService.extractUsernameFromBearer(authorizationHeader);
        if (redisService.isAccessRevoked(username)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ");
        }

        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ"));

        if (user.getStatus() == AuthUser.Status.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa, vui lòng liên hệ Phòng Công tác sinh viên.");
        }

        if (oldPassword == null || oldPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mật khẩu hiện tại.");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới cần tối thiểu 6 ký tự.");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Mật khẩu hiện tại không chính xác.");
        }

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu hiện tại.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setStatus(AuthUser.Status.ACTIVE);
        user.setFailedAttempts(0);
        authUserRepository.save(user);

        redisService.unlockUser(username);
        redisService.revokeAccess(username);
        accountEmailService.sendPasswordChangedEmail(user.getEmail(), username);
    }

    @Transactional
    public void revokeUser(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        user.setStatus(AuthUser.Status.INACTIVE);
        authUserRepository.save(user);
        redisService.revokeAccess(username);
        accountEmailService.sendAccountLockedEmail(user.getEmail(), user.getUsername());
    }

    @Transactional
    public int deleteStudentAccounts(List<String> usernames) {
        List<String> cleanUsernames = usernames == null ? List.of() : usernames.stream()
                .filter(username -> username != null && !username.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (cleanUsernames.isEmpty()) {
            return 0;
        }

        List<AuthUser> users = authUserRepository.findByUsernameIn(cleanUsernames);
        List<AuthUser> studentUsers = new ArrayList<>();
        List<String> adminUsernames = new ArrayList<>();
        for (AuthUser user : users) {
            if (user.getRole() == AuthUser.Role.ADMIN) {
                adminUsernames.add(user.getUsername());
            } else {
                studentUsers.add(user);
            }
        }

        if (!adminUsernames.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa tài khoản quản trị: " + adminUsernames);
        }

        if (studentUsers.isEmpty()) {
            return 0;
        }

        studentUsers.forEach(user -> redisService.revokeAccess(user.getUsername()));
        passwordResetTokenRepository.deleteByUserIn(studentUsers);
        authUserRepository.deleteAll(studentUsers);
        System.out.println("Deleted student auth accounts: " + studentUsers.size() + "/" + cleanUsernames.size());
        return studentUsers.size();
    }

    public void bulkRegister(List<com.authservice.dto.BulkRegisterMessage.UserAccountDTO> accounts) {
        bulkRegister(accounts, true);
    }

    public void bulkRegister(List<com.authservice.dto.BulkRegisterMessage.UserAccountDTO> accounts, boolean sendMail) {
        Map<String, com.authservice.dto.BulkRegisterMessage.UserAccountDTO> uniqueAccounts = accounts.stream()
                .filter(account -> account.getUsername() != null && !account.getUsername().isBlank())
                .collect(Collectors.toMap(
                        account -> account.getUsername().trim(),
                        account -> account,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        Map<String, AuthUser> existingUsersByUsername = authUserRepository.findByUsernameIn(uniqueAccounts.keySet())
                .stream()
                .collect(Collectors.toMap(AuthUser::getUsername, Function.identity()));

        Set<String> requestedEmails = uniqueAccounts.values().stream()
                .map(account -> resolveEmail(account.getEmail(), account.getUsername()))
                .filter(email -> email != null && !email.isBlank())
                .collect(Collectors.toSet());
        Map<String, AuthUser> existingEmailOwners = authUserRepository.findByEmailIn(requestedEmails)
                .stream()
                .filter(user -> user.getEmail() != null)
                .collect(Collectors.toMap(
                        user -> user.getEmail().toLowerCase(),
                        Function.identity(),
                        (first, ignored) -> first
                ));

        List<AuthUser> users = new ArrayList<>();
        List<CreatedCredential> createdCredentials = new ArrayList<>();
        Set<String> reservedEmails = new HashSet<>();
        int skippedAdmins = 0;
        int createdAccounts = 0;
        int resetPendingAccounts = 0;
        int skippedInitializedAccounts = 0;
        for (com.authservice.dto.BulkRegisterMessage.UserAccountDTO account : uniqueAccounts.values()) {
            String username = account.getUsername().trim();
            AuthUser user = existingUsersByUsername.get(username);
            if (user != null && user.getRole() == AuthUser.Role.ADMIN) {
                skippedAdmins++;
                continue;
            }

            String accountEmail = resolveBulkEmail(account.getEmail(), username, user, existingEmailOwners, reservedEmails);

            if (user == null) {
                user = new AuthUser();
                user.setUsername(username);
                user.setRole(AuthUser.Role.STUDENT);
                createdAccounts++;
                issueTemporaryPassword(user, accountEmail, createdCredentials);
                users.add(user);
                continue;
            }

            if (user.getStatus() == AuthUser.Status.REQUIRE_CHANGE_PWD) {
                resetPendingAccounts++;
                issueTemporaryPassword(user, accountEmail, createdCredentials);
                users.add(user);
                redisService.unlockUser(username);
                redisService.revokeAccess(username);
                continue;
            }

            skippedInitializedAccounts++;
            if (!sameEmail(user.getEmail(), accountEmail)) {
                user.setEmail(accountEmail);
                users.add(user);
            }
        }

        authUserRepository.saveAll(users);
        if (sendMail) {
            createdCredentials.forEach(credential ->
                    accountEmailService.sendInitialPasswordEmailQuiet(
                            credential.email(),
                            credential.username(),
                            credential.rawPassword()
                    )
            );
        }
        System.out.println("Prepared bulk accounts: " + users.size() + "/" + uniqueAccounts.size()
                + ", skipped admins: " + skippedAdmins
                + ", created accounts: " + createdAccounts
                + ", reset pending accounts: " + resetPendingAccounts
                + ", skipped initialized accounts: " + skippedInitializedAccounts
                + ", send mail: " + sendMail);
    }

    @Transactional
    public void unlockUser(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        user.setStatus(AuthUser.Status.ACTIVE);
        user.setFailedAttempts(0);
        authUserRepository.save(user);

        redisService.unlockUser(username);
        accountEmailService.sendAccountUnlockedEmail(user.getEmail(), user.getUsername());
    }

    @Transactional
    public void resetPassword(String username) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        String randomPass = UUID.randomUUID().toString().substring(0, 8);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
        user.setFailedAttempts(0);
        authUserRepository.save(user);

        redisService.revokeAccess(username);
        accountEmailService.sendResetPasswordEmail(user.getEmail(), username, randomPass);
        System.out.println("Admin reset password for " + username);
    }

    public List<AuthUser> getAllUsers() {
        return authUserRepository.findAll();
    }

    private AuthUser findUserByUsernameOrEmail(String usernameOrEmail) {
        String lookup = usernameOrEmail.trim();
        if (lookup.contains("@")) {
            AuthUser byEmail = authUserRepository.findByEmail(lookup.toLowerCase()).orElse(null);
            if (byEmail != null) {
                return byEmail;
            }
        }

        AuthUser byUsername = authUserRepository.findByUsername(lookup).orElse(null);
        if (byUsername != null) {
            return byUsername;
        }

        return authUserRepository.findByEmail(lookup.toLowerCase()).orElse(null);
    }

    private void expireOutstandingResetTokens(AuthUser user, Instant usedAt) {
        passwordResetTokenRepository.findByUserAndUsedAtIsNull(user)
                .forEach(token -> token.setUsedAt(usedAt));
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte value : hash) {
                hex.append(String.format("%02x", value & 0xff));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private String buildPasswordResetLink(String rawToken) {
        String baseUrl = passwordResetUrl == null || passwordResetUrl.isBlank()
                ? "http://localhost:5173/reset-password"
                : passwordResetUrl.trim();
        String separator = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + separator + "token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
    }

    private TokenResponse issueTokens(AuthUser user) {
        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken();
        redisService.saveRefreshToken(refreshToken, user.getUsername());
        return new TokenResponse(accessToken, refreshToken);
    }

    private String resolveAvailableEmail(String email, String username) {
        String requestedEmail = resolveEmail(email, username);
        if (authUserRepository.findByEmail(requestedEmail).isEmpty()) {
            return requestedEmail;
        }
        return defaultStudentEmail(username);
    }

    private String resolveEmailForInternalRegister(String email, String username) {
        String requestedEmail = resolveEmail(email, username);
        AuthUser existingEmailOwner = authUserRepository.findByEmail(requestedEmail).orElse(null);
        if (existingEmailOwner != null && !existingEmailOwner.getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được dùng cho tài khoản khác");
        }
        return requestedEmail;
    }

    private String resolveAvailableEmail(String email, String username, Set<String> reservedEmails) {
        String requestedEmail = resolveEmail(email, username);
        if (reservedEmails.add(requestedEmail)) {
            return requestedEmail;
        }

        String fallbackEmail = defaultStudentEmail(username);
        reservedEmails.add(fallbackEmail);
        return fallbackEmail;
    }

    private String resolveBulkEmail(
            String email,
            String username,
            AuthUser currentUser,
            Map<String, AuthUser> existingEmailOwners,
            Set<String> reservedEmails
    ) {
        String requestedEmail = resolveEmail(email, username);
        AuthUser requestedOwner = existingEmailOwners.get(requestedEmail);
        if ((requestedOwner == null || requestedOwner.getUsername().equals(username))
                && reservedEmails.add(requestedEmail)) {
            return requestedEmail;
        }

        String fallbackEmail = defaultStudentEmail(username);
        AuthUser fallbackOwner = existingEmailOwners.get(fallbackEmail);
        if ((fallbackOwner == null || fallbackOwner.getUsername().equals(username))
                && reservedEmails.add(fallbackEmail)) {
            return fallbackEmail;
        }

        if (currentUser != null && currentUser.getEmail() != null && !currentUser.getEmail().isBlank()) {
            return currentUser.getEmail().trim().toLowerCase();
        }

        return fallbackEmail;
    }

    private String resolveEmail(String email, String username) {
        if (email != null && !email.isBlank()) {
            return email.trim().toLowerCase();
        }
        return defaultStudentEmail(username);
    }

    private String defaultStudentEmail(String username) {
        String domain = studentEmailDomain == null || studentEmailDomain.isBlank()
                ? "student.edu.vn"
                : studentEmailDomain.trim().replaceFirst("^@", "");
        return username.trim().toLowerCase() + "@" + domain.toLowerCase();
    }

    private void issueTemporaryPassword(AuthUser user, String accountEmail, boolean sendMail) {
        String randomPass = generateTemporaryPassword();
        user.setEmail(accountEmail);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setRole(AuthUser.Role.STUDENT);
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
        user.setFailedAttempts(0);
        authUserRepository.save(user);
        redisService.unlockUser(user.getUsername());
        redisService.revokeAccess(user.getUsername());
        if (sendMail) {
            accountEmailService.sendInitialPasswordEmail(accountEmail, user.getUsername(), randomPass);
        }
    }

    private void issueTemporaryPassword(AuthUser user, String accountEmail, List<CreatedCredential> createdCredentials) {
        String randomPass = generateTemporaryPassword();
        user.setEmail(accountEmail);
        user.setPasswordHash(passwordEncoder.encode(randomPass));
        user.setRole(AuthUser.Role.STUDENT);
        user.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
        user.setFailedAttempts(0);
        createdCredentials.add(new CreatedCredential(user.getUsername(), accountEmail, randomPass));
    }

    private String generateTemporaryPassword() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private boolean sameEmail(String left, String right) {
        String cleanLeft = left == null ? "" : left.trim().toLowerCase();
        String cleanRight = right == null ? "" : right.trim().toLowerCase();
        return cleanLeft.equals(cleanRight);
    }

    private record CreatedCredential(String username, String email, String rawPassword) {
    }
}
