package com.certificationservice.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UserProfileDTO {
    private String studentId;
    private String fullName;
    private LocalDate dob;
    private String gender;
    private String contactPhone;
    private String studentStatus;
    private ClazzDTO clazz;

    @Data
    public static class ClazzDTO {
        private String id;
        private String classCode;
        private FacultyDTO faculty;
        private AcademicYearDTO academicYear;
    }

    @Data
    public static class FacultyDTO {
        private String id;
        private String facultyCode;
        private String facultyName;
    }

    @Data
    public static class AcademicYearDTO {
        private String id;
        private String yearName;
        private Integer startYear;
    }
}
