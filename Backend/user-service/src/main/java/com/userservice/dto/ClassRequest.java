package com.userservice.dto;

import com.userservice.domain.Clazz;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClassRequest {
    @NotBlank(message = "Mã lớp không được để trống")
    @Size(min = 2, max = 50, message = "Mã lớp phải từ 2 đến 50 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "Mã lớp chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang")
    private String classCode;

    @NotBlank(message = "Khoa không được để trống")
    @Pattern(regexp = "^[0-9]+$", message = "Khoa không hợp lệ")
    private String facultyId;

    @Pattern(regexp = "^$|^[0-9]+$", message = "Niên khóa không hợp lệ")
    private String academicYearId;

    @Size(max = 50, message = "Tên niên khóa không được vượt quá 50 ký tự")
    @Pattern(regexp = "^$|^[\\p{L}\\p{N}\\s._/-]+$", message = "Tên niên khóa chỉ gồm chữ, số, khoảng trắng, dấu chấm, gạch dưới, gạch ngang hoặc dấu /")
    private String academicYearName;

    @Min(value = 1900, message = "Năm bắt đầu không hợp lệ")
    @Max(value = 2100, message = "Năm bắt đầu không hợp lệ")
    private Integer startYear;

    @NotNull(message = "Trạng thái lớp không được để trống")
    private Clazz.Status status = Clazz.Status.ACTIVE;

    @AssertTrue(message = "Chỉ chọn niên khóa có sẵn hoặc nhập niên khóa mới, không dùng cả hai")
    public boolean isSingleAcademicYearSource() {
        return isBlank(academicYearId) || isBlank(academicYearName);
    }

    @AssertTrue(message = "Vui lòng nhập năm bắt đầu khi tạo niên khóa mới")
    public boolean isNewAcademicYearComplete() {
        return isBlank(academicYearName) || startYear != null;
    }

    @AssertTrue(message = "Tên niên khóa phải từ 3 đến 50 ký tự")
    public boolean isAcademicYearNameLengthValid() {
        return isBlank(academicYearName) || academicYearName.trim().length() >= 3;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
