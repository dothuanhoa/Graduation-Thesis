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

    @Column(name = "is_attended", nullable = false)
    private boolean attended = false;

    @Column(name = "checkin_time")
    private LocalDateTime checkinTime;
}
