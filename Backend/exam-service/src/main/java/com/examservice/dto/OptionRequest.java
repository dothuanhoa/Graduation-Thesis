package com.examservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OptionRequest {
    @NotBlank(message = "Nội dung đáp án không được để trống")
    @Size(max = 1000, message = "Nội dung đáp án không được vượt quá 1000 ký tự")
    private String content;

    private boolean correct;
}
