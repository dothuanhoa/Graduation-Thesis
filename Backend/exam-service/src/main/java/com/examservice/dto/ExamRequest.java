package com.examservice.dto;

import com.examservice.domain.Exam;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ExamRequest {
    @NotBlank(message = "Tên kỳ thi không được để trống")
    private String title;

    private String description;

    @NotNull(message = "Thời gian mở đề không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian đóng đề không được để trống")
    @Future(message = "Thời gian đóng đề phải ở tương lai")
    private LocalDateTime endTime;

    @NotNull(message = "Thời lượng làm bài không được để trống")
    @Min(value = 1, message = "Thời lượng làm bài phải lớn hơn 0")
    private Integer durationMins = 30;

    @NotNull(message = "Số câu hỏi bốc đề không được để trống")
    @Min(value = 1, message = "Số câu hỏi phải lớn hơn 0")
    private Integer questionCount = 30;

    @NotBlank(message = "Vui lòng chọn đối tượng thi")
    private String targetGroupCode = "1";

    private List<@Valid ExamTargetRequest> targets = new ArrayList<>();

    private Exam.Status status = Exam.Status.INACTIVE;
}
