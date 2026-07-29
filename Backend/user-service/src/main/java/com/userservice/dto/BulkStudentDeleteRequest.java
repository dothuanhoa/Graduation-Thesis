package com.userservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentDeleteRequest {
    @NotEmpty(message = "Vui lòng chọn ít nhất một sinh viên")
    @Size(max = 500, message = "Không được xóa quá 500 sinh viên mỗi lần")
    private List<@NotNull(message = "Mã sinh viên không được để trống") Long> studentIds;
}
