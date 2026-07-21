package com.userservice.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "user_profiles", indexes = {
    @Index(name = "idx_student_id", columnList = "student_id"),
    @Index(name = "idx_student_group", columnList = "student_group_id")
})
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserProfile {
    
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @Column(name = "student_id", nullable = false, unique = true, length = 50)
    private String studentId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Email(message = "Email sinh viên không hợp lệ")
    @Column(length = 100)
    private String email;

    @Column(name = "dob")
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private Clazz clazz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_group_id")
    private StudentGroup studentGroup;

    @Enumerated(EnumType.STRING)
    @Column(name = "student_status", length = 30)
    private StudentStatus studentStatus;

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum StudentStatus {
        STUDYING, RESERVED, SUSPENDED, GRADUATED
    }
}
