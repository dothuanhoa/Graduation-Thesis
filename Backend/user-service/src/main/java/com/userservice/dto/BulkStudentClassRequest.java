package com.userservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentClassRequest {
    @NotEmpty(message = "Vui lòng chọn ít nhất một sinh viên")
    private List<Long> studentIds;

    @NotNull(message = "Vui lòng chọn lớp")
    private Long classId;
}
