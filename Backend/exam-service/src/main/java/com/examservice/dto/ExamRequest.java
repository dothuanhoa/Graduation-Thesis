package com.examservice.dto;

import com.examservice.domain.Exam;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ExamRequest {
    @NotBlank(message = "Tên kỳ thi không được để trống")
    @Size(min = 3, max = 255, message = "Tên kỳ thi phải từ 3 đến 255 ký tự")
    private String title;

    @Size(max = 2000, message = "Mô tả kỳ thi không được vượt quá 2000 ký tự")
    private String description;

    @NotNull(message = "Thời gian mở đề không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian đóng đề không được để trống")
    @Future(message = "Thời gian đóng đề phải ở tương lai")
    private LocalDateTime endTime;

    @NotNull(message = "Thời lượng làm bài không được để trống")
    @Min(value = 1, message = "Thời lượng làm bài phải lớn hơn 0")
    @Max(value = 600, message = "Thời lượng làm bài không được vượt quá 600 phút")
    private Integer durationMins = 30;

    @NotNull(message = "Số câu hỏi bốc đề không được để trống")
    @Min(value = 1, message = "Số câu hỏi phải lớn hơn 0")
    @Max(value = 200, message = "Số câu hỏi bốc đề không được vượt quá 200")
    private Integer questionCount = 30;

    @NotBlank(message = "Vui lòng chọn đối tượng thi")
    @Pattern(regexp = "^[123]$", message = "Đối tượng thi không hợp lệ")
    private String targetGroupCode = "1";

    @Size(max = 50, message = "Không được cấu hình quá 50 dòng đối tượng thi")
    private List<@Valid ExamTargetRequest> targets = new ArrayList<>();

    @NotNull(message = "Trạng thái kỳ thi không được để trống")
    private Exam.Status status = Exam.Status.INACTIVE;

    @AssertTrue(message = "Thời gian đóng đề phải sau thời gian mở đề")
    public boolean isDateRangeValid() {
        return startTime == null || endTime == null || endTime.isAfter(startTime);
    }
}
