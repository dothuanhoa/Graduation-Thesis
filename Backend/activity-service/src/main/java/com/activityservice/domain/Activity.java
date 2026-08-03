package com.activityservice.domain;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
@Data
public class Activity {
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Category category;

    @Column(length = 100)
    private String reward;

    @Enumerated(EnumType.STRING)
    @Column(name = "participation_type", length = 20)
    private ParticipationType participationType = ParticipationType.LIMITED;

    @Column(name = "google_form_url", length = 500)
    private String googleFormUrl;

    @Column(name = "registration_start_time")
    private LocalDateTime registrationStartTime;

    @Column(name = "registration_end_time")
    private LocalDateTime registrationEndTime;

    @Column(length = 255)
    private String location;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column
    private Integer capacity;

    @Column(name = "attendance_session_count", nullable = false, columnDefinition = "integer default 2")
    private Integer attendanceSessionCount = 2;

    @Column(name = "middle_qr_code", length = 120)
    private String middleQrCode;

    @Column(name = "middle_qr_expires_at")
    private LocalDateTime middleQrExpiresAt;

    @Column(name = "final_qr_code", length = 120)
    private String finalQrCode;

    @Column(name = "final_qr_expires_at")
    private LocalDateTime finalQrExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.UPCOMING;

    @Column(name = "created_by", nullable = false, length = 50)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Category {
        ACADEMIC, MOVEMENT, FACULTY, UNIVERSITY, OTHER
    }

    public enum ParticipationType {
        LIMITED, OPEN
    }

    public enum Status {
        UPCOMING, ONGOING, COMPLETED
    }

    public enum AttendanceSession {
        FACE, MIDDLE, FINAL
    }
}
