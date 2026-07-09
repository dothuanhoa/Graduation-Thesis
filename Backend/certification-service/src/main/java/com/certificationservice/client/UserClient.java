package com.certificationservice.client;

import com.certificationservice.dto.UserProfileDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "USER-SERVICE", path = "/api/users")
public interface UserClient {
    
    // Giả định API lấy profile sinh viên bên user-service là GET /api/users/profile/{studentId}
    @GetMapping("/profile/{studentId}")
    UserProfileDTO getStudentProfile(@PathVariable("studentId") String studentId);
}
