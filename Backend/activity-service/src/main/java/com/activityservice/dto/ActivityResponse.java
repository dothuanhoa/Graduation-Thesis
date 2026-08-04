package com.activityservice.dto;

import com.activityservice.domain.Activity;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ActivityResponse {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String title;
    private Activity.Category category;
    private String reward;
    private Activity.ParticipationType participationType;
    private String googleFormUrl;
    private LocalDateTime registrationStartTime;
    private LocalDateTime registrationEndTime;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer capacity;
    private Integer attendanceSessionCount;
    private LocalDateTime middleQrExpiresAt;
    private boolean middleQrLocationRequired;
    private Integer middleQrAllowedRadiusMeters;
    private Double middleQrLatitude;
    private Double middleQrLongitude;
    private LocalDateTime finalQrExpiresAt;
    private boolean finalQrLocationRequired;
    private Integer finalQrAllowedRadiusMeters;
    private Double finalQrLatitude;
    private Double finalQrLongitude;
    private Activity.Status status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long registrationCount;
    private long attendedCount;
    private long checkerCount;
    private boolean currentUserRegistered;
    private boolean registrationOpen;
    private boolean registrationFull;
    private Integer remainingSlots;
}
