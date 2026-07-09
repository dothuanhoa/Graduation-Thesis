package com.certificationservice.domain;

import com.certificationservice.domain.enums.RequestStatus;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "confirmation_requests", indexes = {
    @Index(name = "idx_student_id", columnList = "student_id"),
    @Index(name = "idx_status", columnList = "status")
})
@Data
public class ConfirmationRequest {
    
    @Id
    @Tsid
    private Long id;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_type_id", nullable = false)
    private FormType formType;

    @Column(length = 1000)
    private String reason;

    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @Column(name = "proof_file_url", length = 500)
    private String proofFileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "appointment_date")
    private LocalDate appointmentDate;

    @Column(length = 20)
    private String semester;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
