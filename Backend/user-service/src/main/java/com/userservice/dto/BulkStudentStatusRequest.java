package com.userservice.dto;

import com.userservice.domain.UserProfile;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentStatusRequest {
    @NotEmpty(message = "Vui lòng chọn ít nhất một sinh viên")
    private List<Long> studentIds;

    @NotNull(message = "Vui lòng chọn trạng thái")
    private UserProfile.StudentStatus status;
}
