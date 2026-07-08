package com.certificationservice.controller;

import com.certificationservice.dto.FormTypeDTO;
import com.certificationservice.service.FormTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certifications/form-types")
@RequiredArgsConstructor
public class FormTypeController {

    private final FormTypeService formTypeService;

    @GetMapping
    public ResponseEntity<List<FormTypeDTO>> getAllActiveFormTypes() {
        return ResponseEntity.ok(formTypeService.getAllActiveFormTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormTypeDTO> getFormTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(formTypeService.getFormTypeById(id));
    }

    @PostMapping
    public ResponseEntity<FormTypeDTO> createFormType(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody FormTypeDTO dto) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(formTypeService.createFormType(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FormTypeDTO> updateFormType(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable Long id, 
            @Valid @RequestBody FormTypeDTO dto) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(formTypeService.updateFormType(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormType(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable Long id) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        formTypeService.deleteFormType(id);
        return ResponseEntity.noContent().build();
    }
}
