package com.examservice.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    private String id;
    private String studentId;
    private StudentGroupDTO studentGroup;

    @Data
    public static class StudentGroupDTO {
        private Integer id;
        private String code;
        private String name;
    }
}
