package com.authservice.repository;

import com.authservice.domain.AuthUser;
import com.authservice.domain.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    long countByUserAndCreatedAtBetween(AuthUser user, Instant start, Instant end);

    List<PasswordResetToken> findByUserAndUsedAtIsNull(AuthUser user);

    void deleteByUserIn(Collection<AuthUser> users);
}
