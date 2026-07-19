package com.examservice.dto;

import com.examservice.domain.ExamTarget;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ExamTargetRequest {
    @NotBlank(message = "Vui lòng chọn nhóm sinh viên")
    private String targetGroupCode = "1";

    private String facultyId;
    private String facultyCode;
    private String facultyName;
    private List<String> classIds = new ArrayList<>();
    private List<String> classCodes = new ArrayList<>();
    private ExamTarget.TargetMode targetMode = ExamTarget.TargetMode.CLASS;
    private List<String> studentIds = new ArrayList<>();
    private List<String> studentCodes = new ArrayList<>();
    private List<String> studentNames = new ArrayList<>();

    @NotNull(message = "Thời gian mở đề không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian đóng đề không được để trống")
    private LocalDateTime endTime;
}
