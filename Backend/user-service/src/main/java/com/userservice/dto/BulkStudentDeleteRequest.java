package com.userservice.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentDeleteRequest {
    @NotEmpty(message = "Vui lòng chọn ít nhất một sinh viên")
    private List<Long> studentIds;
}
