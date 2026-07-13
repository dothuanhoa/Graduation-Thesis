package com.examservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentOptionResponse {
    private String id;
    private String content;
}
