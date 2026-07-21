package com.authservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RedisService {
    private final StringRedisTemplate redisTemplate;
    private final long refreshTokenTtlDays;
    private final long accessTokenTtlMinutes;

    public RedisService(
            StringRedisTemplate redisTemplate,
            @Value("${app.auth.refresh-token-ttl-days:7}") long refreshTokenTtlDays,
            @Value("${app.jwt.access-token-ttl-minutes:15}") long accessTokenTtlMinutes
    ) {
        this.redisTemplate = redisTemplate;
        this.refreshTokenTtlDays = Math.max(1, refreshTokenTtlDays);
        this.accessTokenTtlMinutes = Math.max(1, accessTokenTtlMinutes);
    }

    public void saveRefreshToken(String token, String userId) {
        // Lưu mapping từ token -> userId
        redisTemplate.opsForValue().set("refresh_token:" + token, userId, refreshTokenTtlDays, TimeUnit.DAYS);
        // Thêm token vào danh sách các token của user
        redisTemplate.opsForSet().add("user_refresh_tokens:" + userId, token);
        redisTemplate.expire("user_refresh_tokens:" + userId, refreshTokenTtlDays, TimeUnit.DAYS);
    }

    public String findUserIdByRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return redisTemplate.opsForValue().get("refresh_token:" + token);
    }

    public void deleteRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        String userId = findUserIdByRefreshToken(token);
        redisTemplate.delete("refresh_token:" + token);
        if (userId != null && !userId.isBlank()) {
            redisTemplate.opsForSet().remove("user_refresh_tokens:" + userId, token);
        }
    }

    public void lockoutUser(String username) {
        redisTemplate.opsForValue().set("lockout:" + username, "locked", 15, TimeUnit.MINUTES);
    }

    public boolean isLockedOut(String username) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("lockout:" + username));
    }

    public void revokeAccess(String userId) {
        // 1. Lấy toàn bộ Refresh Token của user
        String tokenSetKey = "user_refresh_tokens:" + userId;
        var tokens = redisTemplate.opsForSet().members(tokenSetKey);
        if (tokens != null && !tokens.isEmpty()) {
            for (String token : tokens) {
                redisTemplate.delete("refresh_token:" + token);
            }
            redisTemplate.delete(tokenSetKey);
        }

        // 2. Lưu jwt_blacklist bằng thời gian sống của access token
        redisTemplate.opsForValue().set("jwt_blacklist:" + userId, "banned", accessTokenTtlMinutes, TimeUnit.MINUTES);
    }

    public boolean isAccessRevoked(String username) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("jwt_blacklist:" + username));
    }

    public void unlockUser(String username) {
        redisTemplate.delete("lockout:" + username);
        redisTemplate.delete("jwt_blacklist:" + username);
    }

    public void clearRevokedAccess(String username) {
        redisTemplate.delete("jwt_blacklist:" + username);
    }
}
