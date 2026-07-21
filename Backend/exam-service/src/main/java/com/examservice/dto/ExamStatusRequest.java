package com.examservice.dto;

import com.examservice.domain.Exam;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExamStatusRequest {
    @NotNull
    private Exam.Status status;
}
