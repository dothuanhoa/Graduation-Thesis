package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckerRequest {
    @NotBlank(message = "Mã checker không được để trống")
    private String checkerTsid;

    private String checkerCode;
    private String checkerName;
}
