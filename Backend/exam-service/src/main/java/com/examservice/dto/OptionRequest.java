package com.examservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OptionRequest {
    @NotBlank(message = "Nội dung đáp án không được để trống")
    private String content;

    private boolean correct;
}
