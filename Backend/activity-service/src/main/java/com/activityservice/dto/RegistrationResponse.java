package com.activityservice.dto;

import com.activityservice.domain.ActivityRegistration;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RegistrationResponse {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String userTsid;
    private String studentCode;
    private String fullName;
    private boolean attended;
    private LocalDateTime checkinTime;
    private boolean faceVerified;
    private LocalDateTime faceVerifiedTime;
    private boolean middleAttended;
    private LocalDateTime middleCheckinTime;
    private boolean finalAttended;
    private LocalDateTime finalCheckinTime;
    private ActivityRegistration.AttendanceResult attendanceResult;
}
