package com.userservice.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "MSSV không được để trống")
    @Size(max = 50, message = "MSSV không được vượt quá 50 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "MSSV chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang")
    @Column(name = "student_id", nullable = false, unique = true, length = 50)
    private String studentId;

    @NotBlank(message = "Họ tên sinh viên không được để trống")
    @Size(min = 2, max = 100, message = "Họ tên sinh viên phải từ 2 đến 100 ký tự")
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Email(message = "Email sinh viên không hợp lệ")
    @Size(max = 100, message = "Email không được vượt quá 100 ký tự")
    @Column(length = 100)
    private String email;

    @Past(message = "Ngày sinh phải nhỏ hơn ngày hiện tại")
    @Column(name = "dob")
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Size(max = 15, message = "Số điện thoại không được vượt quá 15 ký tự")
    @Pattern(regexp = "^$|^\\s*(0|\\+84)\\d{8,10}\\s*$", message = "Số điện thoại không hợp lệ")
    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private Clazz clazz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_group_id")
    private StudentGroup studentGroup;

    @NotNull(message = "Trạng thái sinh viên không được để trống")
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
