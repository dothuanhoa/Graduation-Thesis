package com.userservice.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentGroupRequest {
    @NotNull(message = "Vui lòng chọn phạm vi chuyển nhóm")
    private Scope scope;

    @Size(max = 500, message = "Không được cập nhật quá 500 sinh viên mỗi lần")
    private List<@NotNull(message = "Mã sinh viên không được để trống") Long> studentIds;
    @Positive(message = "Lớp không hợp lệ")
    private Long classId;
    @Positive(message = "Niên khóa không hợp lệ")
    private Long academicYearId;

    @NotNull(message = "Vui lòng chọn nhóm sinh viên")
    @Min(value = 1, message = "Nhóm sinh viên không hợp lệ")
    @Max(value = 3, message = "Nhóm sinh viên không hợp lệ")
    private Integer studentGroupId;

    @AssertTrue(message = "Vui lòng chọn ít nhất một sinh viên")
    public boolean isSelectedStudentsValid() {
        return scope != Scope.SELECTED_STUDENTS || (studentIds != null && !studentIds.isEmpty());
    }

    @AssertTrue(message = "Vui lòng chọn lớp")
    public boolean isClassScopeValid() {
        return scope != Scope.CLASS || classId != null;
    }

    @AssertTrue(message = "Vui lòng chọn niên khóa")
    public boolean isAcademicYearScopeValid() {
        return scope != Scope.ACADEMIC_YEAR || academicYearId != null;
    }

    public enum Scope {
        SELECTED_STUDENTS,
        CLASS,
        ACADEMIC_YEAR
    }
}
