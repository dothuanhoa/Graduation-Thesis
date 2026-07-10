package com.userservice.domain;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.hypersistence.utils.hibernate.id.Tsid;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "academic_years")
@Data
public class AcademicYear {
    
    @Id
    @Tsid
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @Column(name = "year_name", nullable = false, length = 50)
    private String yearName;

    @Column(name = "start_year")
    private Integer startYear;
}
