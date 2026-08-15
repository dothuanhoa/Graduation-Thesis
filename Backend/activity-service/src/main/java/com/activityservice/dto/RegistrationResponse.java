package com.activityservice.dto;

import com.activityservice.domain.ActivityRegistration;
import com.activityservice.domain.Activity;
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
    private String classCode;
    @JsonSerialize(using = ToStringSerializer.class)
    private Long activityId;
    private String activityTitle;
    private Activity.Category activityCategory;
    private String activityReward;
    private String activityLocation;
    private LocalDateTime activityStartTime;
    private LocalDateTime activityEndTime;
    private Activity.Status activityStatus;
    private Integer activityAttendanceSessionCount;
    private boolean attended;
    private LocalDateTime checkinTime;
    private boolean faceVerified;
    private LocalDateTime faceVerifiedTime;
    private String faceVerifiedBy;
    private String faceVerificationNote;
    private boolean middleAttended;
    private LocalDateTime middleCheckinTime;
    private boolean middleLocationVerified;
    private Double middleLatitude;
    private Double middleLongitude;
    private Double middleLocationAccuracyMeters;
    private Double middleDistanceMeters;
    private boolean finalAttended;
    private LocalDateTime finalCheckinTime;
    private boolean finalLocationVerified;
    private Double finalLatitude;
    private Double finalLongitude;
    private Double finalLocationAccuracyMeters;
    private Double finalDistanceMeters;
    private ActivityRegistration.AttendanceResult attendanceResult;
}
