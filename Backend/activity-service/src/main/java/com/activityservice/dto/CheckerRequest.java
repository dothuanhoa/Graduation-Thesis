package com.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CheckerRequest {
    private String checkerTsid;

    @NotBlank(message = "Mã người điểm danh không được để trống")
    @Size(max = 50, message = "Mã người điểm danh không được vượt quá 50 ký tự")
    private String checkerCode;

    @NotBlank(message = "Họ tên người điểm danh không được để trống")
    @Size(min = 2, max = 100, message = "Họ tên người điểm danh phải từ 2 đến 100 ký tự")
    private String checkerName;
}
