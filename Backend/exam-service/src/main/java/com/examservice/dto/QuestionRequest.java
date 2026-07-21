package com.examservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class QuestionRequest {
    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String content;

    @Valid
    @Size(min = 2, message = "Một câu hỏi cần ít nhất 2 đáp án")
    private List<OptionRequest> options = new ArrayList<>();
}
