package com.certificationservice.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class UserProfileDTO {
    private String studentId;
    private String fullName;
    private LocalDate dob;
    private String gender;
    private String contactPhone;
    private String studentStatus;
    // Có thể thêm tên lớp nếu backend bên user-service trả về (VD: clazzName)
}
