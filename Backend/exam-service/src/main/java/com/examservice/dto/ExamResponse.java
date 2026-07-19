package com.examservice.dto;

import com.examservice.domain.Exam;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ExamResponse {
    private String id;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer durationMins;
    private Integer questionCount;
    private String targetGroupCode;
    private String targetGroupName;
    private List<ExamTargetResponse> targets;
    private Long availableQuestionCount;
    private Exam.Status status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
