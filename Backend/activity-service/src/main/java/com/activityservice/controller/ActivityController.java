package com.activityservice.controller;

import com.activityservice.domain.Activity;
import com.activityservice.dto.*;
import com.activityservice.exception.ForbiddenException;
import com.activityservice.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/activities")
@CrossOrigin(origins = "*")
public class ActivityController {
    private final ActivityService activityService;

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> getActivities() {
        return ResponseEntity.ok(activityService.findAll());
    }

    @GetMapping("/checker/me")
    public ResponseEntity<List<ActivityResponse>> getMyCheckerActivities(
            @RequestHeader(value = "X-User-Code") String checkerCode) {
        return ResponseEntity.ok(activityService.findOngoingForChecker(checkerCode));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityResponse> getActivity(@PathVariable Long id) {
        return ResponseEntity.ok(activityService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ActivityResponse> createActivity(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @RequestHeader(value = "X-User-Code", defaultValue = "UNKNOWN") String createdBy,
            @Valid @RequestBody ActivityRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.create(request, createdBy));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityResponse> updateActivity(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody ActivityRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ActivityResponse> updateStatus(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody ActivityStatusRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.updateStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        activityService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/registrations/import")
    public ResponseEntity<ImportResult> importRegistrations(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.importRegistrations(id, file));
    }

    @GetMapping("/{id}/registrations")
    public ResponseEntity<List<RegistrationResponse>> getRegistrations(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.getRegistrations(id));
    }

    @PostMapping("/{id}/registrations")
    public ResponseEntity<RegistrationResponse> addRegistration(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody RegistrationRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.addRegistration(id, request));
    }

    @DeleteMapping("/{activityId}/registrations/{registrationId}")
    public ResponseEntity<Void> removeRegistration(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long activityId,
            @PathVariable Long registrationId) {
        requireAdmin(role);
        activityService.removeRegistration(activityId, registrationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/checkers")
    public ResponseEntity<CheckerResponse> addChecker(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id,
            @Valid @RequestBody CheckerRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.addChecker(id, request));
    }

    @GetMapping("/{id}/checkers")
    public ResponseEntity<List<CheckerResponse>> getCheckers(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long id) {
        requireAdmin(role);
        return ResponseEntity.ok(activityService.getCheckers(id));
    }

    @DeleteMapping("/{activityId}/checkers/{checkerId}")
    public ResponseEntity<Void> removeChecker(
            @RequestHeader(value = "X-User-Role", defaultValue = "STUDENT") String role,
            @PathVariable Long activityId,
            @PathVariable Long checkerId) {
        requireAdmin(role);
        activityService.removeChecker(activityId, checkerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/checkin")
    public ResponseEntity<RegistrationResponse> checkin(
            @RequestHeader(value = "X-User-Code") String checkerTsid,
            @PathVariable Long id,
            @Valid @RequestBody CheckinRequest request) {
        return ResponseEntity.ok(activityService.checkin(id, checkerTsid, request));
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new ForbiddenException("Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }
}
