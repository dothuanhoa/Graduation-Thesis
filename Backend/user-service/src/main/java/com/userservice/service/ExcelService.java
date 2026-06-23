package com.userservice.service;

import com.userservice.domain.Clazz;
import com.userservice.domain.UserProfile;
import com.userservice.repository.ClassRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExcelService {

    // Thêm các repositories cần thiết để validate
    // Ví dụ: classRepository để tìm Lớp

    public List<UserProfile> parseExcelFile(MultipartFile file) {
        List<UserProfile> profiles = new ArrayList<>();
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                UserProfile profile = new UserProfile();
                profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);

                // Lấy ô 1 (Index 1) - MSSV
                Cell mssvCell = currentRow.getCell(1, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                mssvCell.setCellType(CellType.STRING);
                profile.setStudentId(mssvCell.getStringCellValue());

                // Lấy ô 2 (Index 2) - Họ Tên
                Cell nameCell = currentRow.getCell(2, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                nameCell.setCellType(CellType.STRING);
                profile.setFullName(nameCell.getStringCellValue());

                // Lấy ô 4 (Index 4) - Giới tính
                Cell genderCell = currentRow.getCell(4, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                genderCell.setCellType(CellType.STRING);
                String genderStr = genderCell.getStringCellValue();
                if ("Nam".equalsIgnoreCase(genderStr)) profile.setGender(UserProfile.Gender.MALE);
                else if ("Nữ".equalsIgnoreCase(genderStr)) profile.setGender(UserProfile.Gender.FEMALE);
                else profile.setGender(UserProfile.Gender.OTHER);

                // Lấy ô 5 (Index 5) - SĐT
                Cell phoneCell = currentRow.getCell(5, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                phoneCell.setCellType(CellType.STRING);
                profile.setContactPhone(phoneCell.getStringCellValue());
                
                // Tránh add row rỗng
                if (profile.getStudentId() != null && !profile.getStudentId().trim().isEmpty()) {
                    profiles.add(profile);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage());
        }
        return profiles;
    }
}
