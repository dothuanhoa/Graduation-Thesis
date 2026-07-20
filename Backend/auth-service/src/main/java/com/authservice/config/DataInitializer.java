package com.authservice.config;

import com.authservice.domain.AuthUser;
import com.authservice.repository.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private static final String LEGACY_DEFAULT_ADMIN_USERNAME = "admin";
    private static final String LEGACY_DEFAULT_ADMIN_PASSWORD = "admin" + "123";

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-bootstrap.enabled:false}")
    private boolean adminBootstrapEnabled;

    @Value("${app.admin-bootstrap.username:}")
    private String adminUsername;

    @Value("${app.admin-bootstrap.email:}")
    private String adminEmail;

    @Value("${app.admin-bootstrap.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        deactivateLegacyDefaultAdmin();

        if (!adminBootstrapEnabled) {
            return;
        }

        if (!StringUtils.hasText(adminUsername)
                || !StringUtils.hasText(adminEmail)
                || !StringUtils.hasText(adminPassword)) {
            throw new IllegalStateException(
                    "Admin bootstrap is enabled but username, email or password is blank"
            );
        }

        String username = adminUsername.trim();
        if (isLegacyDefaultAdminCredential(username, adminPassword)) {
            throw new IllegalStateException("Refuse to bootstrap legacy default admin credential");
        }

        if (authUserRepository.findByUsername(username).isPresent()) {
            return;
        }

        AuthUser admin = new AuthUser();
        admin.setUsername(username);
        admin.setEmail(adminEmail.trim());
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setRole(AuthUser.Role.ADMIN);
        admin.setStatus(AuthUser.Status.ACTIVE);
        authUserRepository.save(admin);
        log.info("Admin bootstrap account '{}' was created", username);
    }

    private void deactivateLegacyDefaultAdmin() {
        authUserRepository.findByUsername(LEGACY_DEFAULT_ADMIN_USERNAME)
                .filter(user -> user.getRole() == AuthUser.Role.ADMIN)
                .filter(user -> passwordEncoder.matches(LEGACY_DEFAULT_ADMIN_PASSWORD, user.getPasswordHash()))
                .filter(user -> user.getStatus() != AuthUser.Status.INACTIVE)
                .ifPresent(user -> {
                    user.setStatus(AuthUser.Status.INACTIVE);
                    authUserRepository.save(user);
                    log.warn("Legacy default admin account '{}' was deactivated. Create a secure admin account via ADMIN_BOOTSTRAP_* env vars.",
                            LEGACY_DEFAULT_ADMIN_USERNAME);
                });
    }

    private boolean isLegacyDefaultAdminCredential(String username, String password) {
        return LEGACY_DEFAULT_ADMIN_USERNAME.equals(username)
                && LEGACY_DEFAULT_ADMIN_PASSWORD.equals(password);
    }
}
