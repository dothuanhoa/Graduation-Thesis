package com.userservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AcademicYearResponse {
    private String id;
    private String yearName;
    private Integer startYear;
    private Long classCount;
}
