package com.userservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@FeignClient(name = "auth-service", url = "${auth.service.url:}")
public interface AuthServiceClient {

    @PostMapping("/api/auth/internal/register")
    String registerAccount(
            @RequestParam("sendMail") boolean sendMail,
            @RequestBody RegisterRequest request
    );

    @PostMapping("/api/auth/internal/bulk-register")
    String bulkRegisterAccount(
            @RequestParam("sendMail") boolean sendMail,
            @RequestBody java.util.List<com.userservice.dto.BulkRegisterMessage.UserAccountDTO> accounts
    );

    @PostMapping("/api/auth/internal/revoke/{username}")
    String revokeAccess(@RequestHeader("X-User-Role") String role, @PathVariable("username") String username);

    @PostMapping("/api/auth/internal/unlock/{username}")
    String unlockAccess(@RequestHeader("X-User-Role") String role, @PathVariable("username") String username);

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    class RegisterRequest {
        private String username;
        private String email;
    }
}
