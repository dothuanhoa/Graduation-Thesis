package com.examservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class QuestionImportResult {
    private int imported;
    private int skipped;
    private List<String> errors;
}
