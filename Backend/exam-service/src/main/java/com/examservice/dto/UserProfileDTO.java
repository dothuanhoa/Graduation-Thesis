package com.examservice.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    private String id;
    private String studentId;
    private String fullName;
    private ClazzDTO clazz;
    private StudentGroupDTO studentGroup;

    @Data
    public static class StudentGroupDTO {
        private Integer id;
        private String code;
        private String name;
    }

    @Data
    public static class ClazzDTO {
        private String id;
        private String classCode;
        private FacultyDTO faculty;
    }

    @Data
    public static class FacultyDTO {
        private String id;
        private String facultyCode;
        private String facultyName;
    }
}
