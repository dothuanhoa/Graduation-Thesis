package com.certificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProofFileDTO {

    @NotBlank(message = "Vui lòng tải file minh chứng")
    @Size(max = 500, message = "Đường dẫn file minh chứng không được vượt quá 500 ký tự")
    private String proofFileUrl;
}
