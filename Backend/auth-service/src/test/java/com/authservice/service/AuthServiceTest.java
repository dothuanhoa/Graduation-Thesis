package com.authservice.service;

import com.authservice.domain.AuthUser;
import com.authservice.dto.BulkRegisterMessage;
import com.authservice.dto.LoginRequest;
import com.authservice.repository.AuthUserRepository;
import com.authservice.repository.PasswordResetTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock private AuthUserRepository authUserRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private RedisService redisService;
    @Mock private AccountEmailService accountEmailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authUserRepository,
                passwordResetTokenRepository,
                passwordEncoder,
                jwtService,
                redisService,
                accountEmailService
        );
        ReflectionTestUtils.setField(authService, "studentEmailDomain", "student.edu.vn");
        ReflectionTestUtils.setField(authService, "passwordResetMonthlyLimit", 2);
        ReflectionTestUtils.setField(authService, "passwordResetTokenTtlMinutes", 30L);
        ReflectionTestUtils.setField(authService, "passwordResetUrl", "http://localhost:5173/reset-password");
    }

    @Test
    void loginRejectsInactiveAccountAfterPasswordMatches() {
        AuthUser user = activeStudent("DH52201258", "dh52201258@student.edu.vn");
        user.setStatus(AuthUser.Status.INACTIVE);
        LoginRequest request = new LoginRequest();
        request.setUsername("DH52201258");
        request.setPassword("123456");

        when(redisService.isLockedOut("DH52201258")).thenReturn(false);
        when(authUserRepository.findByUsername("DH52201258")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("123456", user.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void passwordResetIsLimitedPerMonth() {
        AuthUser user = activeStudent("DH52201258", "dh52201258@student.edu.vn");
        when(authUserRepository.findByUsername("DH52201258")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.countByUserAndCreatedAtBetween(eq(user), any(Instant.class), any(Instant.class)))
                .thenReturn(2L);

        assertThatThrownBy(() -> authService.requestPasswordReset("DH52201258"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);

        verify(accountEmailService, never()).sendForgotPasswordEmail(any(), any(), any(), any(Long.class));
    }

    @Test
    void bulkRegisterDeduplicatesAccountsAndUsesDefaultStudentEmail() {
        when(authUserRepository.findByUsernameIn(anyCollection())).thenReturn(List.of());
        when(authUserRepository.findByEmailIn(anyCollection())).thenReturn(List.of());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        authService.bulkRegister(List.of(
                new BulkRegisterMessage.UserAccountDTO("DH52201258", null),
                new BulkRegisterMessage.UserAccountDTO("DH52201258", null)
        ));

        ArgumentCaptor<List<AuthUser>> usersCaptor = ArgumentCaptor.forClass(List.class);
        verify(authUserRepository).saveAll(usersCaptor.capture());
        assertThat(usersCaptor.getValue()).hasSize(1);
        assertThat(usersCaptor.getValue().get(0).getEmail()).isEqualTo("dh52201258@student.edu.vn");
        verify(accountEmailService).sendInitialPasswordEmail(eq("dh52201258@student.edu.vn"), eq("DH52201258"), any());
    }

    private AuthUser activeStudent(String username, String email) {
        AuthUser user = new AuthUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash("encoded-password");
        user.setRole(AuthUser.Role.STUDENT);
        user.setStatus(AuthUser.Status.ACTIVE);
        return user;
    }
}