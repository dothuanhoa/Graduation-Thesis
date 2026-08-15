package com.activityservice.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UserProfileDTO {
    private Long id;
    private String studentId;
    private String fullName;
    private ClazzDTO clazz;
    private LocalDate dob;
    private String gender;
    private String contactPhone;
    private String studentStatus;

    @Data
    public static class ClazzDTO {
        private Long id;
        private String classCode;
    }
}
