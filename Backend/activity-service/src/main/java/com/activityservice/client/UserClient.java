package com.activityservice.client;

import com.activityservice.dto.UserProfileDTO;
import com.activityservice.dto.FaceVerificationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@FeignClient(name = "USER-SERVICE", path = "/api/users")
public interface UserClient {
    @GetMapping("/profile/{studentId}")
    UserProfileDTO getStudentProfile(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-Code") String userCode,
            @PathVariable("studentId") String studentId
    );

    @PostMapping(value = "/profile/{studentId}/face/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    FaceVerificationResponse verifyStudentFace(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-User-Code") String userCode,
            @PathVariable("studentId") String studentId,
            @RequestPart("file") MultipartFile file
    );
}
