package com.examservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AnswerSaveRequest {
    @NotBlank
    private String questionId;

    @NotBlank
    private String optionId;
}
