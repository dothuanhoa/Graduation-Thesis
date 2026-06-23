package com.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisService {
    private final StringRedisTemplate redisTemplate;

    public void saveRefreshToken(String token, String userId) {
        // Lưu mapping từ token -> userId
        redisTemplate.opsForValue().set("refresh_token:" + token, userId, 7, TimeUnit.DAYS);
        // Thêm token vào danh sách các token của user
        redisTemplate.opsForSet().add("user_refresh_tokens:" + userId, token);
        redisTemplate.expire("user_refresh_tokens:" + userId, 7, TimeUnit.DAYS);
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

        // 2. Lưu jwt_blacklist (TTL 15 phút bằng với thời gian sống của JWT)
        redisTemplate.opsForValue().set("jwt_blacklist:" + userId, "banned", 15, TimeUnit.MINUTES);
    }

    public void unlockUser(String username) {
        redisTemplate.delete("lockout:" + username);
        redisTemplate.delete("jwt_blacklist:" + username);
    }
}
