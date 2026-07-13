package com.userservice.controller;

import com.userservice.domain.UserProfile;
import com.userservice.domain.StudentGroup;
import com.userservice.dto.BulkStudentClassRequest;
import com.userservice.dto.BulkStudentStatusRequest;
import com.userservice.dto.BulkStudentUpdateResponse;
import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;
import com.userservice.service.ExcelService;
import com.userservice.service.StudentImportJobService;
import com.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;
    private final ExcelService excelService;
    private final StudentImportJobService studentImportJobService;

    @GetMapping
    public ResponseEntity<List<UserProfile>> getUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/profile/{studentId}")
    public ResponseEntity<UserProfile> getUserByStudentId(@PathVariable String studentId) {
        return userService.findByStudentId(studentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/student-groups")
    public ResponseEntity<List<StudentGroup>> getStudentGroups() {
        return ResponseEntity.ok(userService.findAllStudentGroups());
    }

    @PostMapping
    public ResponseEntity<Object> createUser(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody UserProfile userProfile
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        }
        return ResponseEntity.ok(userService.save(userProfile));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> updateUser(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody UserProfile userProfile
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        }
        return ResponseEntity.ok(userService.update(id, userProfile));
    }

    @PatchMapping("/bulk/class")
    public ResponseEntity<Object> assignStudentsToClass(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody BulkStudentClassRequest request
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        }
        BulkStudentUpdateResponse response = userService.assignStudentsToClass(request.getStudentIds(), request.getClassId());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/bulk/status")
    public ResponseEntity<Object> updateStudentStatuses(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody BulkStudentStatusRequest request
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        }
        BulkStudentUpdateResponse response = userService.updateStudentStatuses(request.getStudentIds(), request.getStatus());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteUser(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        }
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<String> importExcel(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        }
        try {
            List<StudentImportRow> rows = excelService.parseExcelFile(file);
            String result = userService.bulkImport(rows);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @PostMapping("/import/jobs")
    public ResponseEntity<Object> startImportJob(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).build();
        }
        try {
            List<StudentImportRow> rows = excelService.parseExcelFile(file);
            return ResponseEntity.accepted().body(studentImportJobService.start(rows));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @GetMapping("/import/jobs/{jobId}")
    public ResponseEntity<StudentImportProgress> getImportJob(@PathVariable String jobId) {
        return studentImportJobService.get(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/me/contacts")
    public ResponseEntity<UserProfile> updateMyContact(
            @RequestHeader("X-User-Code") String studentId,
            @RequestBody Map<String, String> updates
    ) {
        String contactPhone = updates.get("contactPhone");
        if (contactPhone == null || contactPhone.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.updateContactByStudentId(studentId, contactPhone));
    }
}
