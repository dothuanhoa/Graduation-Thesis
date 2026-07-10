package com.activityservice.client;

import com.activityservice.dto.UserProfileDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "USER-SERVICE", path = "/api/users")
public interface UserClient {
    @GetMapping("/profile/{studentId}")
    UserProfileDTO getStudentProfile(@PathVariable("studentId") String studentId);
}
