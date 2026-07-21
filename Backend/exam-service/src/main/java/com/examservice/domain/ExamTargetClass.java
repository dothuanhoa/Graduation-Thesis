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
@Table(name = "exam_target_classes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_exam_target_class", columnNames = {"target_id", "class_identifier"})
}, indexes = {
        @Index(name = "idx_exam_target_class_target", columnList = "target_id"),
        @Index(name = "idx_exam_target_class_identifier", columnList = "class_identifier")
})
@Data
public class ExamTargetClass {
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

    @Column(name = "class_identifier", nullable = false, length = 80)
    private String classIdentifier;
}
