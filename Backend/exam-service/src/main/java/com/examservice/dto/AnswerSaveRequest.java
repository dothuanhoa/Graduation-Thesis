package com.examservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AnswerSaveRequest {
    @NotBlank(message = "Mã câu hỏi không được để trống")
    @Size(max = 32, message = "Mã câu hỏi không hợp lệ")
    @Pattern(regexp = "^[0-9]+$", message = "Mã câu hỏi không hợp lệ")
    private String questionId;

    @NotBlank(message = "Mã đáp án không được để trống")
    @Size(max = 32, message = "Mã đáp án không hợp lệ")
    @Pattern(regexp = "^[0-9]+$", message = "Mã đáp án không hợp lệ")
    private String optionId;
}
