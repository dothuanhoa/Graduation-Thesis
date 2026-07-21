package com.notificationservice.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    private String studentId;
    private ClazzDTO clazz;

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
