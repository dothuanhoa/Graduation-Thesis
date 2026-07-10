package com.userservice.domain;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "faculties")
@Data
public class Faculty {
    
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @Column(name = "faculty_code", nullable = false, unique = true, length = 20)
    private String facultyCode;

    @Column(name = "faculty_name", nullable = false)
    private String facultyName;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Status status = Status.ACTIVE;

    public enum Status {
        ACTIVE,
        INACTIVE
    }
}
