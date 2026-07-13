package com.examservice.dto;

import com.examservice.domain.ExamAttempt;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AttemptResponse {
    private String id;
    private String examId;
    private String examTitle;
    private String userTsid;
    private Double score;
    private Integer correctCount;
    private Integer totalQuestions;
    private Integer violationCount;
    private ExamAttempt.Status status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private String lockedReason;
}
