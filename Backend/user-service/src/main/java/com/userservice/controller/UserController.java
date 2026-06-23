package com.userservice.controller;

import com.userservice.domain.UserProfile;
import com.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.userservice.service.ExcelService;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;
    private final ExcelService excelService;

    @GetMapping
    public ResponseEntity<List<UserProfile>> getUsers(){
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getUserById(@PathVariable Long id){
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role, @Valid @RequestBody UserProfile userProfile) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        return ResponseEntity.ok(userService.save(userProfile));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role, @PathVariable Long id, @Valid @RequestBody UserProfile userProfile) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        return ResponseEntity.ok(userService.update(id, userProfile));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role, @PathVariable Long id) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<String> importExcel(@RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role, @RequestParam("file") MultipartFile file) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body("Chỉ Admin mới có quyền này");
        try {
            List<UserProfile> profiles = excelService.parseExcelFile(file);
            String result = userService.bulkImport(profiles);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    // API Tự phục vụ: Cập nhật thông tin cá nhân (chỉ cho phép đổi SĐT)
    // Đọc MSSV từ X-User-Code do Gateway đã xác thực và truyền xuống
    @PatchMapping("/me/contacts")
    public ResponseEntity<UserProfile> updateMyContact(@RequestHeader("X-User-Code") String studentId,
                                                       @RequestBody java.util.Map<String, String> updates) {
        String contactPhone = updates.get("contactPhone");
        if (contactPhone == null || contactPhone.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.updateContactByStudentId(studentId, contactPhone));
    }
}
