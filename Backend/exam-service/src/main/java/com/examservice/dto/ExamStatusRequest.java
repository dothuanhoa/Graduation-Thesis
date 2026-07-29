package com.examservice.dto;

import com.examservice.domain.Exam;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExamStatusRequest {
    @NotNull(message = "Trạng thái kỳ thi không được để trống")
    private Exam.Status status;
}
