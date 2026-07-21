package com.apigateway.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

@Component
public class JwtUtil {
    private final SecretKey signingKey;

    public JwtUtil(@Value("${app.jwt.secret}") String secret) {
        this.signingKey = buildSigningKey(secret);
    }

    public void validateToken(final String token) {
        Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token);
    }

    public String extractSubject(final String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload().getSubject();
    }

    public String extractClaim(final String token, String claimKey) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload().get(claimKey, String.class);
    }

    private SecretKey buildSigningKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET chưa được cấu hình");
        }
        byte[] keyBytes = io.jsonwebtoken.io.Decoders.BASE64.decode(secret.trim());
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
