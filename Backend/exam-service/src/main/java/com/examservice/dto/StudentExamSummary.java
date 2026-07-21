package com.examservice.dto;

import com.examservice.domain.ExamAttempt;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class StudentExamSummary {
    private String id;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer durationMins;
    private Integer questionCount;
    private String targetGroupCode;
    private String targetGroupName;
    private ExamTargetResponse eligibleTarget;
    private String availabilityStatus;
    private ExamAttempt.Status attemptStatus;
    private Double score;
    private Integer violationCount;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
}
