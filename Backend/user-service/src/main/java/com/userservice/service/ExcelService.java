package com.userservice.service;

import com.userservice.domain.UserProfile;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExcelService {

    private final DataFormatter formatter = new DataFormatter();

    public List<UserProfile> parseExcelFile(MultipartFile file) {
        List<UserProfile> profiles = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            Map<String, Integer> columns = new HashMap<>();

            while (rows.hasNext()) {
                Row currentRow = rows.next();

                if (rowNumber == 0) {
                    columns = resolveColumnIndexes(currentRow);
                    rowNumber++;
                    continue;
                }

                UserProfile profile = new UserProfile();
                profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);
                profile.setStudentId(readString(currentRow, columns.getOrDefault("studentId", 1)).trim());
                profile.setFullName(readString(currentRow, columns.getOrDefault("fullName", 2)).trim());
                profile.setGender(parseGender(readString(currentRow, columns.getOrDefault("gender", 4))));
                profile.setContactPhone(readString(currentRow, columns.getOrDefault("phone", 5)).trim());

                if (!profile.getStudentId().isBlank() && !profile.getFullName().isBlank()) {
                    profiles.add(profile);
                }

                rowNumber++;
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage(), e);
        }

        return profiles;
    }

    private Map<String, Integer> resolveColumnIndexes(Row headerRow) {
        Map<String, Integer> indexes = new HashMap<>();

        for (Cell cell : headerRow) {
            String header = normalize(readString(cell));

            if (header.contains("mssv") || header.contains("ma sinh vien") || header.contains("student id")) {
                indexes.put("studentId", cell.getColumnIndex());
            } else if (header.contains("ho ten") || header.contains("full name")) {
                indexes.put("fullName", cell.getColumnIndex());
            } else if (header.contains("gioi tinh") || header.contains("gender")) {
                indexes.put("gender", cell.getColumnIndex());
            } else if (header.contains("so dien thoai") || header.contains("sdt") || header.contains("phone")) {
                indexes.put("phone", cell.getColumnIndex());
            }
        }

        return indexes;
    }

    private String readString(Row row, int columnIndex) {
        return readString(row.getCell(columnIndex, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK));
    }

    private String readString(Cell cell) {
        return formatter.formatCellValue(cell);
    }

    private UserProfile.Gender parseGender(String gender) {
        String normalized = normalize(gender);
        if ("nam".equals(normalized) || "male".equals(normalized)) {
            return UserProfile.Gender.MALE;
        }
        if ("nu".equals(normalized) || "female".equals(normalized)) {
            return UserProfile.Gender.FEMALE;
        }
        return UserProfile.Gender.OTHER;
    }

    private String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value.trim().toLowerCase(), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").replace('đ', 'd');
    }
}
