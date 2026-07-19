package com.notificationservice.controller;

import com.notificationservice.service.NotificationImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications/images")
@RequiredArgsConstructor
public class NotificationImageController {
    private final NotificationImageService notificationImageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file
    ) {
        if (!isAdmin(role)) {
            return ResponseEntity.status(403).body(Map.of("message", "Chi quan tri vien moi duoc tai anh thong bao."));
        }

        try {
            String fileUrl = notificationImageService.uploadImage(file);
            return ResponseEntity.ok(Map.of("location", fileUrl, "fileUrl", fileUrl));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Khong luu duoc anh thong bao."));
        }
    }

    private boolean isAdmin(String role) {
        if (role == null || role.isBlank()) {
            return false;
        }
        String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
        if (normalizedRole.startsWith("ROLE_")) {
            normalizedRole = normalizedRole.substring("ROLE_".length());
        }
        return "ADMIN".equals(normalizedRole);
    }
}