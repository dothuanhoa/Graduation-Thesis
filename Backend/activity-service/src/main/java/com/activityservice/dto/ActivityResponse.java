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
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer capacity;
    private Activity.Status status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long registrationCount;
    private long attendedCount;
    private long checkerCount;
}
