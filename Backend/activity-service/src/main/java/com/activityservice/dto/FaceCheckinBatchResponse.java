package com.activityservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FaceCheckinBatchResponse {
    private int recognizedCount;
    private int checkedInCount;
    private int skippedCount;
    private List<RegistrationResponse> registrations;
    private List<String> skipped;
}
