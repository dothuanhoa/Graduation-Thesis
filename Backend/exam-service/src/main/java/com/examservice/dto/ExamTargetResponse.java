package com.examservice.dto;

import com.examservice.domain.ExamTarget;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ExamTargetResponse {
    private String id;
    private String targetGroupCode;
    private String targetGroupName;
    private String facultyId;
    private String facultyCode;
    private String facultyName;
    private List<String> classIds;
    private List<String> classCodes;
    private ExamTarget.TargetMode targetMode;
    private List<String> studentIds;
    private List<String> studentCodes;
    private List<String> studentNames;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
