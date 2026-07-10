package com.userservice.dto;

import com.userservice.domain.Faculty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FacultyResponse {
    private String id;
    private String facultyCode;
    private String facultyName;
    private Faculty.Status status;
    private Long classCount;
    private Long studentCount;
}
