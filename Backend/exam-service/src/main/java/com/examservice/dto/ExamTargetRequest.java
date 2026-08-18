package com.examservice.dto;

import com.examservice.domain.ExamTarget;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ExamTargetRequest {
    @NotBlank(message = "Vui lòng chọn nhóm sinh viên")
    @Pattern(regexp = "^[123]$", message = "Nhóm sinh viên không hợp lệ")
    private String targetGroupCode = "1";

    @Size(max = 50, message = "Mã khoa không được vượt quá 50 ký tự")
    private String facultyId;

    @Size(max = 50, message = "Mã khoa không được vượt quá 50 ký tự")
    private String facultyCode;

    @Size(max = 255, message = "Tên khoa không được vượt quá 255 ký tự")
    private String facultyName;

    @Size(max = 500, message = "Không được chọn quá 500 lớp")
    private List<String> classIds = new ArrayList<>();

    @Size(max = 500, message = "Không được chọn quá 500 lớp")
    private List<String> classCodes = new ArrayList<>();

    @NotNull(message = "Phạm vi thi không được để trống")
    private ExamTarget.TargetMode targetMode = ExamTarget.TargetMode.CLASS;

    @Size(max = 3000, message = "Không được chọn quá 3000 sinh viên")
    private List<String> studentIds = new ArrayList<>();

    private List<String> studentCodes = new ArrayList<>();

    private List<String> studentNames = new ArrayList<>();

    @NotNull(message = "Thời gian mở đề không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian đóng đề không được để trống")
    private LocalDateTime endTime;

    @AssertTrue(message = "Giờ đóng phải sau giờ mở")
    public boolean isDateRangeValid() {
        return startTime == null || endTime == null || endTime.isAfter(startTime);
    }

    @AssertTrue(message = "Vui lòng chọn ít nhất một lớp hoặc sinh viên")
    public boolean isTargetSelectionValid() {
        if (targetMode == null) {
            return true;
        }
        boolean hasClass = hasAnyText(classIds) || hasAnyText(classCodes);
        boolean hasStudent = hasAnyText(studentIds) || hasAnyText(studentCodes);
        return switch (targetMode) {
            case CLASS -> hasClass;
            case STUDENT -> hasStudent;
            case BOTH -> hasClass || hasStudent;
        };
    }

    private boolean hasAnyText(List<String> values) {
        return values != null && values.stream().anyMatch(value -> value != null && !value.trim().isEmpty());
    }
}
