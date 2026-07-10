package com.userservice.dto;

import com.userservice.domain.Clazz;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClassResponse {
    private String id;
    private String classCode;
    private FacultySummary faculty;
    private AcademicYearResponse academicYear;
    private Clazz.Status status;
    private Long studentCount;

    @Data
    @Builder
    public static class FacultySummary {
        private String id;
        private String facultyCode;
        private String facultyName;
    }
}
