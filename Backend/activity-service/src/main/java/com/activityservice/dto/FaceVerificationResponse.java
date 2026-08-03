package com.activityservice.dto;

import lombok.Data;

@Data
public class FaceVerificationResponse {
    private boolean verified;
    private Float similarity;
    private Float threshold;
    private String message;
}
