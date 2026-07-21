package com.examservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OptionResponse {
    private String id;
    private String content;
    private Boolean correct;
}
