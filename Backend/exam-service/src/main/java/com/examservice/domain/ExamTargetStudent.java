package com.examservice.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "exam_target_students", uniqueConstraints = {
        @UniqueConstraint(name = "uk_exam_target_student", columnNames = {"target_id", "student_identifier"})
}, indexes = {
        @Index(name = "idx_exam_target_student_target", columnList = "target_id"),
        @Index(name = "idx_exam_target_student_identifier", columnList = "student_identifier")
})
@Data
public class ExamTargetStudent {
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ExamTarget target;

    @Column(name = "student_identifier", nullable = false, length = 80)
    private String studentIdentifier;
}
