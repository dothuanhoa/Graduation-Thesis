package com.userservice.controller;

import com.userservice.dto.AcademicYearRequest;
import com.userservice.dto.AcademicYearResponse;
import com.userservice.dto.ClassRequest;
import com.userservice.dto.ClassResponse;
import com.userservice.dto.FacultyRequest;
import com.userservice.dto.FacultyResponse;
import com.userservice.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class OrganizationController {
    private final OrganizationService organizationService;

    @GetMapping("/faculties")
    public ResponseEntity<List<FacultyResponse>> getFaculties(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.getFaculties());
    }

    @PostMapping("/faculties")
    public ResponseEntity<FacultyResponse> createFaculty(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody FacultyRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.createFaculty(request));
    }

    @PutMapping("/faculties/{id}")
    public ResponseEntity<FacultyResponse> updateFaculty(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody FacultyRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.updateFaculty(id, request));
    }

    @DeleteMapping("/faculties/{id}")
    public ResponseEntity<Void> deleteFaculty(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        organizationService.deleteFaculty(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/classes")
    public ResponseEntity<List<ClassResponse>> getClasses(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.getClasses());
    }

    @PostMapping("/classes")
    public ResponseEntity<ClassResponse> createClass(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody ClassRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.createClass(request));
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<ClassResponse> updateClass(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody ClassRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.updateClass(id, request));
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<Void> deleteClass(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        organizationService.deleteClass(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/academic-years")
    public ResponseEntity<List<AcademicYearResponse>> getAcademicYears(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.getAcademicYears());
    }

    @PostMapping("/academic-years")
    public ResponseEntity<AcademicYearResponse> createAcademicYear(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody AcademicYearRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.createAcademicYear(request));
    }

    @PutMapping("/academic-years/{id}")
    public ResponseEntity<AcademicYearResponse> updateAcademicYear(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody AcademicYearRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(organizationService.updateAcademicYear(id, request));
    }

    @DeleteMapping("/academic-years/{id}")
    public ResponseEntity<Void> deleteAcademicYear(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        organizationService.deleteAcademicYear(id);
        return ResponseEntity.noContent().build();
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }
}
