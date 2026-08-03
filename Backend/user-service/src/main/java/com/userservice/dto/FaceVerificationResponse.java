package com.userservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FaceVerificationResponse {
    private boolean verified;
    private Float similarity;
    private Float threshold;
    private String message;
}
