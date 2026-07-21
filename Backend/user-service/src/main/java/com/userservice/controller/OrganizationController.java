package com.userservice.controller;

import com.userservice.dto.AcademicYearRequest;
import com.userservice.dto.AcademicYearResponse;
import com.userservice.dto.ClassRequest;
import com.userservice.dto.ClassResponse;
import com.userservice.dto.FacultyRequest;
import com.userservice.dto.FacultyResponse;
import com.userservice.dto.OrganizationImportSummary;
import com.userservice.dto.StudentImportRow;
import com.userservice.service.ExcelService;
import com.userservice.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class OrganizationController {
    private final OrganizationService organizationService;
    private final ExcelService excelService;

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

    @PostMapping("/faculties/import")
    public ResponseEntity<String> importFaculties(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file) {
        requireAdmin(role);
        try {
            List<StudentImportRow> rows = excelService.parseOrganizationFile(file);
            OrganizationImportSummary summary = organizationService.importFaculties(rows);
            return ResponseEntity.ok(summary.toFacultyMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
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

    @PostMapping("/classes/import")
    public ResponseEntity<String> importClasses(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file) {
        requireAdmin(role);
        try {
            List<StudentImportRow> rows = excelService.parseOrganizationFile(file);
            OrganizationImportSummary summary = organizationService.importClasses(rows);
            return ResponseEntity.ok(summary.toClassMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
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

    @PostMapping("/academic-years/import")
    public ResponseEntity<String> importAcademicYears(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file) {
        requireAdmin(role);
        try {
            List<StudentImportRow> rows = excelService.parseOrganizationFile(file);
            OrganizationImportSummary summary = organizationService.importAcademicYears(rows);
            return ResponseEntity.ok(summary.toAcademicYearMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
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
