package com.apigateway.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {
    private final JwtUtil jwtUtil = new JwtUtil();

    @Test
    void extractsSubjectAndRoleFromValidToken() {
        String token = Jwts.builder()
                .subject("admin")
                .claim("role", "ADMIN")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(signingKey())
                .compact();

        assertThatCode(() -> jwtUtil.validateToken(token)).doesNotThrowAnyException();
        assertThat(jwtUtil.extractSubject(token)).isEqualTo("admin");
        assertThat(jwtUtil.extractClaim(token, "role")).isEqualTo("ADMIN");
    }

    @Test
    void rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtUtil.validateToken("not-a-jwt"))
                .isInstanceOf(Exception.class);
    }

    private SecretKey signingKey() {
        byte[] keyBytes = io.jsonwebtoken.io.Decoders.BASE64.decode(JwtUtil.SECRET);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}