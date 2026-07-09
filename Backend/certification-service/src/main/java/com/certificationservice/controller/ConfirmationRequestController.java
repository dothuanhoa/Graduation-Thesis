package com.certificationservice.controller;

import com.certificationservice.dto.ConfirmationRequestDTO;
import com.certificationservice.dto.CreateConfirmationRequestDTO;
import com.certificationservice.dto.UpdateStatusDTO;
import com.certificationservice.service.ConfirmationRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certifications/requests")
@RequiredArgsConstructor
public class ConfirmationRequestController {

    private final ConfirmationRequestService requestService;

    // --- API DÀNH CHO SINH VIÊN ---

    @PostMapping
    public ResponseEntity<ConfirmationRequestDTO> createRequest(
            @RequestHeader(value = "X-User-Code") String studentId,
            @RequestHeader(value = "X-User-Role") String role,
            @Valid @RequestBody CreateConfirmationRequestDTO dto) {
        if (!"STUDENT".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.createRequest(studentId, dto));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<ConfirmationRequestDTO>> getMyRequests(
            @RequestHeader(value = "X-User-Code") String studentId,
            @RequestHeader(value = "X-User-Role") String role) {
        if (!"STUDENT".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(requestService.getMyRequests(studentId));
    }

    @GetMapping("/my-requests/{id}")
    public ResponseEntity<ConfirmationRequestDTO> getMyRequestDetail(
            @RequestHeader(value = "X-User-Code") String studentId,
            @RequestHeader(value = "X-User-Role") String role,
            @PathVariable Long id) {
        if (!"STUDENT".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        ConfirmationRequestDTO dto = requestService.getRequestDetail(id);
        // Kiểm tra xem request này có phải của sinh viên đang login không
        if (!dto.getStudentId().equals(studentId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/my-requests/{id}/cancel")
    public ResponseEntity<Void> cancelMyRequest(
            @RequestHeader(value = "X-User-Code") String studentId,
            @RequestHeader(value = "X-User-Role") String role,
            @PathVariable Long id) {
        if (!"STUDENT".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        requestService.cancelRequest(id, studentId);
        return ResponseEntity.noContent().build();
    }

    // --- API DÀNH CHO ADMIN ---

    @GetMapping
    public ResponseEntity<Page<ConfirmationRequestDTO>> getAllRequests(
            @RequestHeader(value = "X-User-Role") String role,
            Pageable pageable) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(requestService.getAllRequests(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConfirmationRequestDTO> getRequestDetailForAdmin(
            @RequestHeader(value = "X-User-Role") String role,
            @PathVariable Long id) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(requestService.getRequestDetail(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ConfirmationRequestDTO> updateRequestStatus(
            @RequestHeader(value = "X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusDTO dto) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(requestService.updateRequestStatus(id, dto));
    }
}
