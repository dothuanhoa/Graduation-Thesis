package com.activityservice.domain;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(
        name = "activity_checkers",
        uniqueConstraints = @UniqueConstraint(name = "uk_activity_checker", columnNames = {"activity_id", "checker_tsid"})
)
@Data
public class ActivityChecker {
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(name = "checker_tsid", nullable = false, length = 50)
    private String checkerTsid;

    @Column(name = "checker_code", length = 50)
    private String checkerCode;

    @Column(name = "checker_name", length = 150)
    private String checkerName;
}
