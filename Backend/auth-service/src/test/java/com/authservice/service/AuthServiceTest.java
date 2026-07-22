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
    void internalRegisterCanSkipInitialEmail() {
        when(authUserRepository.findByEmail("dh52201258@student.edu.vn")).thenReturn(Optional.empty());
        when(authUserRepository.findByUsername("DH52201258")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        authService.internalRegister("DH52201258", null, false);

        ArgumentCaptor<AuthUser> userCaptor = ArgumentCaptor.forClass(AuthUser.class);
        verify(authUserRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getUsername()).isEqualTo("DH52201258");
        assertThat(userCaptor.getValue().getStatus()).isEqualTo(AuthUser.Status.REQUIRE_CHANGE_PWD);
        verify(accountEmailService, never()).sendInitialPasswordEmail(any(), any(), any());
    }

    @Test
    void updateStudentEmailDoesNotResetPasswordOrSendMail() {
        AuthUser user = activeStudent("DH52201258", "old@student.edu.vn");
        when(authUserRepository.findByUsername("DH52201258")).thenReturn(Optional.of(user));
        when(authUserRepository.findByEmail("new@student.edu.vn")).thenReturn(Optional.empty());

        authService.updateStudentEmail("DH52201258", "NEW@student.edu.vn");

        assertThat(user.getEmail()).isEqualTo("new@student.edu.vn");
        assertThat(user.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(user.getStatus()).isEqualTo(AuthUser.Status.ACTIVE);
        verify(authUserRepository).save(user);
        verify(passwordEncoder, never()).encode(any());
        verify(accountEmailService, never()).sendInitialPasswordEmail(any(), any(), any());
        verify(accountEmailService, never()).sendResetPasswordEmail(any(), any(), any());
    }

    @Test
    void updateStudentEmailRejectsEmailOwnedByAnotherAccount() {
        AuthUser user = activeStudent("DH52201258", "old@student.edu.vn");
        AuthUser owner = activeStudent("DH52200001", "new@student.edu.vn");
        when(authUserRepository.findByUsername("DH52201258")).thenReturn(Optional.of(user));
        when(authUserRepository.findByEmail("new@student.edu.vn")).thenReturn(Optional.of(owner));

        assertThatThrownBy(() -> authService.updateStudentEmail("DH52201258", "new@student.edu.vn"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        assertThat(user.getEmail()).isEqualTo("old@student.edu.vn");
        verify(authUserRepository, never()).save(any());
    }

    @Test
    void deleteStudentAccountsRemovesTokensAndRevokesSessionsBeforeDeletingUsers() {
        AuthUser first = activeStudent("DH52201258", "first@student.edu.vn");
        AuthUser second = activeStudent("DH52201259", "second@student.edu.vn");
        when(authUserRepository.findByUsernameIn(anyCollection())).thenReturn(List.of(first, second));

        int deletedCount = authService.deleteStudentAccounts(List.of("DH52201258", "DH52201259"));

        assertThat(deletedCount).isEqualTo(2);
        verify(redisService).revokeAccess("DH52201258");
        verify(redisService).revokeAccess("DH52201259");
        verify(passwordResetTokenRepository).deleteByUserIn(List.of(first, second));
        verify(authUserRepository).deleteAll(List.of(first, second));
    }

    @Test
    void deleteStudentAccountsRejectsAdminAccount() {
        AuthUser admin = activeStudent("admin", "admin@stu.edu.vn");
        admin.setRole(AuthUser.Role.ADMIN);
        when(authUserRepository.findByUsernameIn(anyCollection())).thenReturn(List.of(admin));

        assertThatThrownBy(() -> authService.deleteStudentAccounts(List.of("admin")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(passwordResetTokenRepository, never()).deleteByUserIn(anyCollection());
        verify(authUserRepository, never()).deleteAll(anyCollection());
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
        verify(accountEmailService).sendInitialPasswordEmailQuiet(eq("dh52201258@student.edu.vn"), eq("DH52201258"), any());
    }

    @Test
    void bulkRegisterSkipsInitialEmailWhenSendMailDisabled() {
        when(authUserRepository.findByUsernameIn(anyCollection())).thenReturn(List.of());
        when(authUserRepository.findByEmailIn(anyCollection())).thenReturn(List.of());
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        authService.bulkRegister(List.of(
                new BulkRegisterMessage.UserAccountDTO("DH52201258", "student@example.edu.vn")
        ), false);

        ArgumentCaptor<List<AuthUser>> usersCaptor = ArgumentCaptor.forClass(List.class);
        verify(authUserRepository).saveAll(usersCaptor.capture());
        assertThat(usersCaptor.getValue()).hasSize(1);
        assertThat(usersCaptor.getValue().get(0).getEmail()).isEqualTo("student@example.edu.vn");
        verify(accountEmailService, never()).sendInitialPasswordEmailQuiet(any(), any(), any());
    }

    @Test
    void bulkRegisterDoesNotResetPasswordForStudentWhoAlreadyChangedPassword() {
        AuthUser existing = activeStudent("DH52201258", "dh52201258@student.edu.vn");
        when(authUserRepository.findByUsernameIn(anyCollection())).thenReturn(List.of(existing));
        when(authUserRepository.findByEmailIn(anyCollection())).thenReturn(List.of(existing));

        authService.bulkRegister(List.of(
                new BulkRegisterMessage.UserAccountDTO("DH52201258", "dh52201258@student.edu.vn")
        ), true);

        ArgumentCaptor<List<AuthUser>> usersCaptor = ArgumentCaptor.forClass(List.class);
        verify(authUserRepository).saveAll(usersCaptor.capture());
        assertThat(usersCaptor.getValue()).isEmpty();
        assertThat(existing.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(existing.getStatus()).isEqualTo(AuthUser.Status.ACTIVE);
        verify(passwordEncoder, never()).encode(any());
        verify(accountEmailService, never()).sendInitialPasswordEmailQuiet(any(), any(), any());
    }

    @Test
    void bulkRegisterResetsPasswordForStudentWhoHasNotChangedPasswordYet() {
        AuthUser existing = activeStudent("DH52201258", "dh52201258@student.edu.vn");
        existing.setStatus(AuthUser.Status.REQUIRE_CHANGE_PWD);
        when(authUserRepository.findByUsernameIn(anyCollection())).thenReturn(List.of(existing));
        when(authUserRepository.findByEmailIn(anyCollection())).thenReturn(List.of(existing));
        when(passwordEncoder.encode(any())).thenReturn("new-encoded-password");

        authService.bulkRegister(List.of(
                new BulkRegisterMessage.UserAccountDTO("DH52201258", "dh52201258@student.edu.vn")
        ), true);

        ArgumentCaptor<List<AuthUser>> usersCaptor = ArgumentCaptor.forClass(List.class);
        verify(authUserRepository).saveAll(usersCaptor.capture());
        assertThat(usersCaptor.getValue()).containsExactly(existing);
        assertThat(existing.getPasswordHash()).isEqualTo("new-encoded-password");
        assertThat(existing.getStatus()).isEqualTo(AuthUser.Status.REQUIRE_CHANGE_PWD);
        verify(redisService).unlockUser("DH52201258");
        verify(redisService).revokeAccess("DH52201258");
        verify(accountEmailService).sendInitialPasswordEmailQuiet(eq("dh52201258@student.edu.vn"), eq("DH52201258"), any());
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
