package com.examservice.dto;

import com.examservice.domain.ExamAttempt;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class ExamStateResponse {
    private String examId;
    private String attemptId;
    private ExamAttempt.Status status;
    private LocalDateTime startedAt;
    private Integer durationMins;
    private Long remainingSeconds;
    private Integer violationCount;
    private Map<String, String> answers;
    private List<StudentQuestionResponse> questions;
}
