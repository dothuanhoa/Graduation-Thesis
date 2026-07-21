package com.userservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.util.List;

@FeignClient(
        name = "auth-service",
        url = "${auth.service.url:}",
        configuration = AuthServiceClient.InternalAuthHeaderConfig.class
)
public interface AuthServiceClient {

    @PostMapping("/api/auth/internal/register")
    String registerAccount(
            @RequestHeader("X-User-Role") String role,
            @RequestParam("sendMail") boolean sendMail,
            @RequestBody RegisterRequest request
    );

    @PostMapping("/api/auth/internal/bulk-register")
    String bulkRegisterAccount(
            @RequestHeader("X-User-Role") String role,
            @RequestParam("sendMail") boolean sendMail,
            @RequestBody java.util.List<com.userservice.dto.BulkRegisterMessage.UserAccountDTO> accounts
    );

    @PostMapping("/api/auth/internal/revoke/{username}")
    String revokeAccess(@RequestHeader("X-User-Role") String role, @PathVariable("username") String username);

    @PostMapping("/api/auth/internal/unlock/{username}")
    String unlockAccess(@RequestHeader("X-User-Role") String role, @PathVariable("username") String username);

    @DeleteMapping("/api/auth/internal/account/{username}")
    String deleteAccount(@RequestHeader("X-User-Role") String role, @PathVariable("username") String username);

    @PostMapping("/api/auth/internal/accounts/delete")
    String deleteAccounts(@RequestHeader("X-User-Role") String role, @RequestBody List<String> usernames);

    @PostMapping("/api/auth/internal/email/{username}")
    String updateEmail(
            @RequestHeader("X-User-Role") String role,
            @PathVariable("username") String username,
            @RequestBody UpdateEmailRequest request
    );

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    class RegisterRequest {
        private String username;
        private String email;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    class UpdateEmailRequest {
        private String email;
    }

    class InternalAuthHeaderConfig {
        @Bean
        RequestInterceptor internalAuthHeaderInterceptor(
                @Value("${app.internal.secret:dev-local-internal-secret}") String internalSecret
        ) {
            return template -> template.header("X-Internal-Secret", internalSecret);
        }
    }
}
