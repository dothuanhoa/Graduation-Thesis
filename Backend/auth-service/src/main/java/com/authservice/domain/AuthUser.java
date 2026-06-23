package com.authservice.domain;

import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "auth_users")
@Data
public class AuthUser {
    
    @Id
    @Tsid
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username; // MSSV

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Role role;

    public Role getRole() {
        return role != null ? role : Role.STUDENT;
    }

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    public enum Status {
        ACTIVE,
        INACTIVE,
        REQUIRE_CHANGE_PWD
    }

    public enum Role {
        STUDENT,
        ADMIN
    }
}
