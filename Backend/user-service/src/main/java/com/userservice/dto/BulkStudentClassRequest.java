package com.userservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentClassRequest {
    @NotEmpty(message = "Vui lòng chọn ít nhất một sinh viên")
    @Size(max = 500, message = "Không được cập nhật quá 500 sinh viên mỗi lần")
    private List<@NotNull(message = "Mã sinh viên không được để trống") Long> studentIds;

    @NotNull(message = "Vui lòng chọn lớp")
    @Positive(message = "Lớp không hợp lệ")
    private Long classId;
}
