package com.activityservice.domain;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "activity_registrations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_activity_user_tsid", columnNames = {"activity_id", "user_tsid"}),
                @UniqueConstraint(name = "uk_activity_student_code", columnNames = {"activity_id", "student_code"})
        }
)
@Data
public class ActivityRegistration {
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(name = "user_tsid", nullable = false, length = 50)
    private String userTsid;

    @Column(name = "student_code", nullable = false, length = 50)
    private String studentCode;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "class_code", length = 50)
    private String classCode;

    @Column(name = "is_attended", nullable = false, columnDefinition = "boolean default false")
    private boolean attended = false;

    @Column(name = "checkin_time")
    private LocalDateTime checkinTime;

    @Column(name = "face_verified", nullable = false, columnDefinition = "boolean default false")
    private boolean faceVerified = false;

    @Column(name = "face_verified_time")
    private LocalDateTime faceVerifiedTime;

    @Column(name = "face_verified_by", length = 50)
    private String faceVerifiedBy;

    @Column(name = "face_verification_note", length = 500)
    private String faceVerificationNote;

    @Column(name = "middle_attended", nullable = false, columnDefinition = "boolean default false")
    private boolean middleAttended = false;

    @Column(name = "middle_checkin_time")
    private LocalDateTime middleCheckinTime;

    @Column(name = "middle_location_verified", nullable = false, columnDefinition = "boolean default false")
    private boolean middleLocationVerified = false;

    @Column(name = "middle_latitude")
    private Double middleLatitude;

    @Column(name = "middle_longitude")
    private Double middleLongitude;

    @Column(name = "middle_location_accuracy_meters")
    private Double middleLocationAccuracyMeters;

    @Column(name = "middle_distance_meters")
    private Double middleDistanceMeters;

    @Column(name = "final_attended", nullable = false, columnDefinition = "boolean default false")
    private boolean finalAttended = false;

    @Column(name = "final_checkin_time")
    private LocalDateTime finalCheckinTime;

    @Column(name = "final_location_verified", nullable = false, columnDefinition = "boolean default false")
    private boolean finalLocationVerified = false;

    @Column(name = "final_latitude")
    private Double finalLatitude;

    @Column(name = "final_longitude")
    private Double finalLongitude;

    @Column(name = "final_location_accuracy_meters")
    private Double finalLocationAccuracyMeters;

    @Column(name = "final_distance_meters")
    private Double finalDistanceMeters;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_result", nullable = false, length = 30, columnDefinition = "varchar(30) default 'NOT_ATTENDED'")
    private AttendanceResult attendanceResult = AttendanceResult.NOT_ATTENDED;

    public enum AttendanceResult {
        NOT_ATTENDED, FACE_NOT_VERIFIED, INCOMPLETE, ATTENDED
    }
}
