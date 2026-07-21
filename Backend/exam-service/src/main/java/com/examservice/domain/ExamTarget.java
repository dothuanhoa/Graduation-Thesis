package com.examservice.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exam_targets", indexes = {
        @Index(name = "idx_exam_target_exam", columnList = "exam_id"),
        @Index(name = "idx_exam_target_group", columnList = "student_group_code")
})
@Data
public class ExamTarget {
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Exam exam;

    @Column(name = "student_group_code", nullable = false, length = 20)
    private String studentGroupCode = "1";

    @Column(name = "faculty_id", length = 50)
    private String facultyId;

    @Column(name = "faculty_code", length = 50)
    private String facultyCode;

    @Column(name = "faculty_name", length = 255)
    private String facultyName;

    @OneToMany(mappedBy = "target", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("classIdentifier ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ExamTargetClass> classes = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "target_mode", nullable = false, length = 20)
    private TargetMode targetMode = TargetMode.CLASS;

    @OneToMany(mappedBy = "target", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("studentIdentifier ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ExamTargetStudent> students = new ArrayList<>();

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    public enum TargetMode {
        CLASS, STUDENT, BOTH
    }
}
