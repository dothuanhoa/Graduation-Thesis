package com.authservice.config;

import com.authservice.domain.AuthUser;
import com.authservice.repository.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {

    private final AuthUserRepository authUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (authUserRepository.findByUsername("admin").isEmpty()) {
            AuthUser admin = new AuthUser();
            admin.setUsername("admin");
            admin.setEmail("admin@stu.edu.vn");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setStatus(AuthUser.Status.ACTIVE);
            admin.setRole(AuthUser.Role.ADMIN);
            authUserRepository.save(admin);
            System.out.println("Đã khởi tạo tài khoản Admin mặc định (admin/admin123)");
        }
    }
}
