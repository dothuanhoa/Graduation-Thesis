package com.apigateway.filter;

import com.apigateway.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private org.springframework.data.redis.core.ReactiveStringRedisTemplate redisTemplate;

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            String authHeader = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                authHeader = authHeader.substring(7);
            } else {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            final String token = authHeader;
            final String userId;
            final String role;

            try {
                jwtUtil.validateToken(token);
                userId = jwtUtil.extractSubject(token);
                role = jwtUtil.extractClaim(token, "role");
            } catch (Exception e) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            // Kiểm tra Redis Blacklist (Bất đồng bộ WebFlux)
            return redisTemplate.hasKey("jwt_blacklist:" + userId)
                    .flatMap(isBanned -> {
                        if (Boolean.TRUE.equals(isBanned)) {
                            // User bị cấm
                            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                            return exchange.getResponse().setComplete();
                        }

                        // An toàn -> Trích xuất ID và Role đưa vào Header
                        var mutatedRequest = exchange.getRequest().mutate()
                                .header("X-User-Code", userId)
                                .header("X-User-Role", role != null ? role : "STUDENT")
                                .build();

                        return chain.filter(exchange.mutate().request(mutatedRequest).build());
                    });
        };
    }

    public static class Config {
    }
}
