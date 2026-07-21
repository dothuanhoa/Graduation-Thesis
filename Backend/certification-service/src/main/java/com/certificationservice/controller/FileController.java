package com.certificationservice.controller;

import com.certificationservice.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping({"/api/certifications/files", "/api/certifications/uploads"})
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            String fileUrl = fileService.uploadFile(file);
            Map<String, String> response = new HashMap<>();
            response.put("fileUrl", fileUrl);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String fileName) {
        return buildFileResponse(fileName);
    }

    @GetMapping("/{academicYear}/{fileName:.+}")
    public ResponseEntity<Resource> getFileByAcademicYear(
            @PathVariable String academicYear,
            @PathVariable String fileName) {
        return buildFileResponse(academicYear + "/" + fileName);
    }

    private ResponseEntity<Resource> buildFileResponse(String fileName) {
        try {
            Resource resource = fileService.loadFileAsResource(fileName);
            MediaType mediaType = resolveSafeMediaType(resource.getFilename());
            if (mediaType == null) {
                return ResponseEntity.notFound().build();
            }

            String disposition = ContentDisposition.inline()
                    .filename(resource.getFilename(), StandardCharsets.UTF_8)
                    .build()
                    .toString();

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                    .header("X-Content-Type-Options", "nosniff")
                    .body(resource);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private MediaType resolveSafeMediaType(String fileName) {
        String normalizedFileName = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (normalizedFileName.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }
        if (normalizedFileName.endsWith(".jpg") || normalizedFileName.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }
        if (normalizedFileName.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        return null;
    }
}
