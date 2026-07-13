package com.examservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class QuestionResponse {
    private String id;
    private String examId;
    private String content;
    private List<OptionResponse> options;
}
