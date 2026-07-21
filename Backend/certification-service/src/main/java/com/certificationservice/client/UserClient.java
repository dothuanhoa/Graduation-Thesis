package com.certificationservice.client;

import com.certificationservice.dto.UserProfileDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "USER-SERVICE", path = "/api/users")
public interface UserClient {

    @GetMapping("/profile/{studentId}")
    UserProfileDTO getStudentProfile(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-Code") String userCode,
            @PathVariable("studentId") String studentId
    );
}
