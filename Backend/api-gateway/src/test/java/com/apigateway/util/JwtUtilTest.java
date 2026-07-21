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
    private static final String TEST_JWT_SECRET = "bXktdGVzdC1qd3Qtc2VjcmV0LW15LXRlc3Qtand0LXNlY3JldA==";

    private final JwtUtil jwtUtil = new JwtUtil(TEST_JWT_SECRET);

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
        byte[] keyBytes = io.jsonwebtoken.io.Decoders.BASE64.decode(TEST_JWT_SECRET);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
