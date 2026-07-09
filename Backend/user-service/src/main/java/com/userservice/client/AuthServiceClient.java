package com.userservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@FeignClient(name = "auth-service", url = "${auth.service.url:}")
public interface AuthServiceClient {

    @PostMapping("/api/auth/internal/register")
    String registerAccount(@RequestBody RegisterRequest request);

    @PostMapping("/api/auth/internal/bulk-register")
    String bulkRegisterAccount(@RequestBody java.util.List<com.userservice.dto.BulkRegisterMessage.UserAccountDTO> accounts);

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    class RegisterRequest {
        private String username;
        private String email;
    }
}
