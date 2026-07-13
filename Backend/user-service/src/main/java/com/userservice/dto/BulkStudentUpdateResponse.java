package com.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BulkStudentUpdateResponse {
    private int updatedCount;
    private String message;
}
