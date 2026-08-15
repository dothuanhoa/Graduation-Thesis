package com.certificationservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.Map;

@Data
public class CreateConfirmationRequestDTO {
    
    @NotNull(message = "Mã loại đơn không được để trống")
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    @Positive(message = "Mã loại đơn không hợp lệ")
    private Long formTypeId;

    @NotBlank(message = "Lý do xác nhận không được để trống")
    @Size(max = 1000, message = "Lý do xác nhận không được vượt quá 1000 ký tự")
    private String reason;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 15, message = "Số điện thoại không được vượt quá 15 ký tự")
    @Pattern(regexp = "^\\s*(0|\\+84)\\d{8,10}\\s*$", message = "Số điện thoại không hợp lệ")
    private String contactPhone;

    @Size(max = 500, message = "Đường dẫn file minh chứng không được vượt quá 500 ký tự")
    private String proofFileUrl;

    @NotBlank(message = "Học kỳ không được để trống")
    @Size(max = 20, message = "Học kỳ không được vượt quá 20 ký tự")
    @Pattern(regexp = "^[\\p{L}\\p{N}\\s._/-]+$", message = "Học kỳ không hợp lệ")
    private String semester;

    @NotEmpty(message = "Dữ liệu trên đơn không được để trống")
    @Size(max = 100, message = "Dữ liệu bổ sung không được vượt quá 100 mục")
    private Map<String, Object> metadata;
}
