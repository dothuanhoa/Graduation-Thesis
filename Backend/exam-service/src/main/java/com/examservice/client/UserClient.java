package com.examservice.client;

import com.examservice.dto.UserProfileDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/users/profile/{studentId}")
    UserProfileDTO getProfileByStudentId(@PathVariable("studentId") String studentId);
}
