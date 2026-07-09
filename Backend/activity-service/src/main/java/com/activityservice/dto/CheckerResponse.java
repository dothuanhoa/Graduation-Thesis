package com.activityservice.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckerResponse {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String checkerTsid;
    private String checkerCode;
    private String checkerName;
}
