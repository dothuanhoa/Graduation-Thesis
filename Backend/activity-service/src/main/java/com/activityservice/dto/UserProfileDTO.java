package com.activityservice.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UserProfileDTO {
    private Long id;
    private String studentId;
    private String fullName;
    private LocalDate dob;
    private String gender;
    private String contactPhone;
    private String studentStatus;
}
