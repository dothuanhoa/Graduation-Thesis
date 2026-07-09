package com.certificationservice.dto;

import com.certificationservice.domain.enums.RequestStatus;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ConfirmationRequestDTO {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;
    private String studentId;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long formTypeId;
    private String formTypeName;
    private String formCode;
    private String reason;
    private String contactPhone;
    private String proofFileUrl;
    private RequestStatus status;
    private String adminNote;
    private LocalDate appointmentDate;
    private String semester;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Thêm trường để chứa thông tin sinh viên khi Admin gọi
    private UserProfileDTO studentProfile;
}
