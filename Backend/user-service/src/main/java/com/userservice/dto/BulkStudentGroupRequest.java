package com.userservice.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkStudentGroupRequest {
    @NotNull(message = "Vui lòng chọn phạm vi chuyển nhóm")
    private Scope scope;

    private List<Long> studentIds;
    private Long classId;
    private Long academicYearId;

    @NotNull(message = "Vui lòng chọn nhóm sinh viên")
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
