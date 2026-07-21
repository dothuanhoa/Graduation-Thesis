package com.examservice.controller;

import com.examservice.domain.Exam;
import com.examservice.dto.*;
import com.examservice.exception.ForbiddenException;
import com.examservice.service.ExamService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/exams")
@CrossOrigin(origins = "*")
public class ExamController {
    private final ExamService examService;

    @GetMapping
    public ResponseEntity<List<ExamResponse>> getExams(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamResponse> getExam(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ExamResponse> createExam(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestHeader(value = "X-User-Code", defaultValue = "UNKNOWN") String createdBy,
            @Valid @RequestBody ExamRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.create(request, createdBy));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExamResponse> updateExam(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody ExamRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ExamResponse> updateExamStatus(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody ExamStatusRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.updateStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExam(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        examService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<List<QuestionResponse>> getQuestions(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.listQuestions(id));
    }

    @PostMapping("/{id}/questions")
    public ResponseEntity<QuestionResponse> createQuestion(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody QuestionRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.createQuestion(id, request));
    }

    @PutMapping("/{examId}/questions/{questionId}")
    public ResponseEntity<QuestionResponse> updateQuestion(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long examId,
            @PathVariable Long questionId,
            @Valid @RequestBody QuestionRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.updateQuestion(examId, questionId, request));
    }

    @DeleteMapping("/{examId}/questions/{questionId}")
    public ResponseEntity<Void> deleteQuestion(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long examId,
            @PathVariable Long questionId) {
        requireAdmin(role);
        examService.deleteQuestion(examId, questionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/questions/import")
    public ResponseEntity<QuestionImportResult> importQuestions(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.importQuestions(id, file));
    }

    @GetMapping("/attempts")
    public ResponseEntity<List<AttemptResponse>> getAllAttempts(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.listAttempts(null));
    }

    @GetMapping("/{id}/attempts")
    public ResponseEntity<List<AttemptResponse>> getExamAttempts(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        return ResponseEntity.ok(examService.listAttempts(id));
    }

    @GetMapping("/my")
    public ResponseEntity<List<StudentExamSummary>> getMyExams(
            @RequestHeader(value = "X-User-Code") String userCode) {
        return ResponseEntity.ok(examService.listForStudent(userCode));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ExamStateResponse> startExam(
            @RequestHeader(value = "X-User-Code") String userCode,
            @PathVariable Long id,
            HttpServletRequest request) {
        return ResponseEntity.ok(examService.startExam(id, userCode, clientAddress(request)));
    }

    @GetMapping("/{id}/state")
    public ResponseEntity<ExamStateResponse> getState(
            @RequestHeader(value = "X-User-Code") String userCode,
            @PathVariable Long id) {
        return ResponseEntity.ok(examService.getState(id, userCode));
    }

    @PutMapping("/{id}/answers")
    public ResponseEntity<ExamStateResponse> saveAnswer(
            @RequestHeader(value = "X-User-Code") String userCode,
            @PathVariable Long id,
            @Valid @RequestBody AnswerSaveRequest request) {
        return ResponseEntity.ok(examService.saveAnswer(id, userCode, request));
    }

    @PostMapping("/{id}/violations")
    public ResponseEntity<ExamStateResponse> recordViolation(
            @RequestHeader(value = "X-User-Code") String userCode,
            @PathVariable Long id) {
        return ResponseEntity.ok(examService.recordViolation(id, userCode));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ExamStateResponse> submit(
            @RequestHeader(value = "X-User-Code") String userCode,
            @PathVariable Long id) {
        return ResponseEntity.ok(examService.submit(id, userCode));
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<AttemptResponse> getResult(
            @RequestHeader(value = "X-User-Code") String userCode,
            @PathVariable Long id) {
        return ResponseEntity.ok(examService.getResult(id, userCode));
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new ForbiddenException("Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }

    private String clientAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
