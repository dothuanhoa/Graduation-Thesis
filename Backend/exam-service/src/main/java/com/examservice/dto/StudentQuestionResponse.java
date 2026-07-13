package com.examservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StudentQuestionResponse {
    private String id;
    private String content;
    private List<StudentOptionResponse> options;
}
