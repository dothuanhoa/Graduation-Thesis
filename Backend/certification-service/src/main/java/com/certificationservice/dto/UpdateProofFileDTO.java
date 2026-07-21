package com.certificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProofFileDTO {

    @NotBlank(message = "Vui lòng tải file minh chứng")
    private String proofFileUrl;
}
