package com.userservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FaceImageImportItemResult {
    private String fileName;
    private String studentId;
    private boolean success;
    private String faceImageUrl;
    private String message;
}
