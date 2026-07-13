package com.userservice.dto;

import com.userservice.domain.UserProfile;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class StudentImportRow {
    private String studentId;
    private String fullName;
    private LocalDate dob;
    private UserProfile.Gender gender;
    private String contactPhone;
    private String classCode;
    private String facultyCode;
    private String facultyName;
    private String academicYearName;
    private Integer academicYearStartYear;
    private String studentGroupCode;
}
