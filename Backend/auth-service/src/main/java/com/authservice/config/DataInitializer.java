package com.authservice.config;

import com.authservice.domain.AuthUser;
import com.authservice.repository.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Tự động tạo tài khoản Admin nếu chưa có
        if (authUserRepository.findByUsername("admin").isEmpty()) {
            AuthUser admin = new AuthUser();
            admin.setUsername("admin");
            admin.setEmail("admin@school.edu.vn");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRole(AuthUser.Role.ADMIN);
            admin.setStatus(AuthUser.Status.ACTIVE);
            authUserRepository.save(admin);
            System.out.println("Đã khởi tạo tài khoản Admin mặc định: admin / admin123");
        }
    }
}
