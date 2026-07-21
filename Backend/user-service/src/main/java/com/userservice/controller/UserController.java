package com.userservice.controller;

import com.userservice.domain.StudentGroup;
import com.userservice.domain.UserProfile;
import com.userservice.dto.BulkStudentClassRequest;
import com.userservice.dto.BulkStudentDeleteRequest;
import com.userservice.dto.BulkStudentGroupRequest;
import com.userservice.dto.BulkStudentStatusRequest;
import com.userservice.dto.BulkStudentUpdateResponse;
import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;
import com.userservice.service.ExcelService;
import com.userservice.service.StudentImportJobService;
import com.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_SYSTEM = "SYSTEM";

    private final UserService userService;
    private final ExcelService excelService;
    private final StudentImportJobService studentImportJobService;

    @GetMapping
    public ResponseEntity<Object> getUsers(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getUserById(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        return userService.findById(id)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/profile/{studentId}")
    public ResponseEntity<Object> getUserByStudentId(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestHeader(value = "X-User-Code", defaultValue = "") String currentUserCode,
            @PathVariable String studentId
    ) {
        if (!isAdminOrSystem(role) && !sameSchoolCode(studentId, currentUserCode)) {
            return forbidden();
        }
        return userService.findByStudentId(studentId)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/student-groups")
    public ResponseEntity<List<StudentGroup>> getStudentGroups() {
        return ResponseEntity.ok(userService.findAllStudentGroups());
    }

    @PostMapping
    public ResponseEntity<Object> createUser(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail,
            @Valid @RequestBody UserProfile userProfile
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        return ResponseEntity.ok(userService.save(userProfile, sendMail));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> updateUser(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody UserProfile userProfile
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        return ResponseEntity.ok(userService.update(id, userProfile));
    }

    @PatchMapping("/bulk/class")
    public ResponseEntity<Object> assignStudentsToClass(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody BulkStudentClassRequest request
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        BulkStudentUpdateResponse response = userService.assignStudentsToClass(request.getStudentIds(), request.getClassId());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/bulk/status")
    public ResponseEntity<Object> updateStudentStatuses(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody BulkStudentStatusRequest request
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        BulkStudentUpdateResponse response = userService.updateStudentStatuses(request.getStudentIds(), request.getStatus());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/bulk/group")
    public ResponseEntity<Object> updateStudentGroups(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody BulkStudentGroupRequest request
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        BulkStudentUpdateResponse response = userService.updateStudentGroups(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk/delete")
    public ResponseEntity<Object> deleteUsers(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @Valid @RequestBody BulkStudentDeleteRequest request
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        BulkStudentUpdateResponse response = userService.deleteAll(request.getStudentIds());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteUser(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<String> importExcel(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail
    ) {
        if (!isAdminOrSystem(role)) {
            return ResponseEntity.status(403).body("Bạn không có quyền thực hiện thao tác này");
        }
        try {
            List<StudentImportRow> rows = excelService.parseExcelFile(file);
            String result = userService.bulkImport(rows, sendMail);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @GetMapping("/import/template")
    public ResponseEntity<byte[]> downloadImportTemplate(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role
    ) {
        if (!isAdminOrSystem(role)) {
            return ResponseEntity.status(403).build();
        }

        byte[] content = excelService.createStudentImportTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mau-import-sinh-vien.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }

    @PostMapping("/import/jobs")
    public ResponseEntity<Object> startImportJob(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sendMail", defaultValue = "true") boolean sendMail
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        try {
            List<StudentImportRow> rows = excelService.parseExcelFile(file);
            return ResponseEntity.accepted().body(studentImportJobService.start(rows, sendMail));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @GetMapping("/import/jobs/{jobId}")
    public ResponseEntity<Object> getImportJob(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable String jobId
    ) {
        if (!isAdminOrSystem(role)) {
            return forbidden();
        }
        return studentImportJobService.get(jobId)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
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

    private boolean isAdminOrSystem(String role) {
        return ROLE_ADMIN.equalsIgnoreCase(role) || ROLE_SYSTEM.equalsIgnoreCase(role);
    }

    private boolean sameSchoolCode(String left, String right) {
        return left != null && right != null && left.trim().equalsIgnoreCase(right.trim());
    }

    private ResponseEntity<Object> forbidden() {
        return ResponseEntity.status(403).body("Bạn không có quyền thực hiện thao tác này");
    }
}
