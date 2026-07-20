package com.examservice.client;

import com.examservice.dto.UserProfileDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/users/profile/{studentId}")
    UserProfileDTO getProfileByStudentId(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-Code") String userCode,
            @PathVariable("studentId") String studentId
    );
}
