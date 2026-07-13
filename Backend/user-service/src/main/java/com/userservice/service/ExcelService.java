package com.userservice.service;

import com.userservice.domain.UserProfile;
import com.userservice.dto.StudentImportRow;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ExcelService {

    private static final Pattern YEAR_PATTERN = Pattern.compile("(19|20|21)\\d{2}");
    private static final DateTimeFormatter[] DATE_FORMATTERS = {
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ISO_LOCAL_DATE
    };

    private final DataFormatter formatter = new DataFormatter(Locale.forLanguageTag("vi-VN"));

    public List<StudentImportRow> parseExcelFile(MultipartFile file) {
        return parseStudentImportFile(file);
    }

    public List<StudentImportRow> parseStudentImportFile(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            return parseWorkbook(workbook);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage(), e);
        }
    }

    public List<StudentImportRow> parseOrganizationFile(MultipartFile file) {
        return parseStudentImportFile(file);
    }

    private List<StudentImportRow> parseWorkbook(Workbook workbook) {
        Map<String, String> facultyDictionary = readFacultyDictionary(workbook);
        Sheet sheet = findDataSheet(workbook);
        Row headerRow = findHeaderRow(sheet);
        List<StudentImportRow> rows = new ArrayList<>();
        if (headerRow == null) {
            return rows;
        }

        ColumnIndexes columns = resolveColumnIndexes(headerRow);
        for (int index = headerRow.getRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
            Row row = sheet.getRow(index);
            if (row == null) {
                continue;
            }

            StudentImportRow item = parseRow(row, columns, facultyDictionary);
            if (!isBlank(item.getStudentId()) || !isBlank(item.getClassCode())
                    || !isBlank(item.getFacultyCode()) || !isBlank(item.getAcademicYearName())) {
                rows.add(item);
            }
        }

        return rows;
    }

    private StudentImportRow parseRow(Row row, ColumnIndexes columns, Map<String, String> facultyDictionary) {
        String studentId = clean(readString(row, columns.studentIdIndex));
        String fullName = clean(joinName(readString(row, columns.fullNameIndex), readString(row, columns.fullNameExtraIndex)));
        String classCode = normalizeCode(readString(row, columns.classCodeIndex));
        String facultyCode = normalizeCode(readString(row, columns.facultyCodeIndex));
        String academicYearName = clean(readString(row, columns.academicYearIndex));
        String facultyName = facultyDictionary.getOrDefault(facultyCode, facultyCode);

        return StudentImportRow.builder()
                .studentId(studentId)
                .fullName(fullName)
                .dob(parseDate(row, columns.dobIndex))
                .gender(parseGender(readString(row, columns.genderIndex)))
                .contactPhone(clean(readString(row, columns.phoneIndex)))
                .classCode(classCode)
                .facultyCode(facultyCode)
                .facultyName(clean(facultyName))
                .academicYearName(academicYearName)
                .academicYearStartYear(parseStartYear(academicYearName))
                .build();
    }

    private Map<String, String> readFacultyDictionary(Workbook workbook) {
        Map<String, String> dictionary = new HashMap<>();

        for (int sheetIndex = 0; sheetIndex < workbook.getNumberOfSheets(); sheetIndex++) {
            Sheet sheet = workbook.getSheetAt(sheetIndex);
            if (!normalize(sheet.getSheetName()).contains("tu dien khoa")) {
                continue;
            }

            for (Row row : sheet) {
                String facultyName = clean(readString(row, 0));
                String facultyCode = normalizeCode(readString(row, 1));
                String normalizedName = normalize(facultyName);

                if (isBlank(facultyName) || isBlank(facultyCode)
                        || normalizedName.contains("ten khoa")
                        || normalize(facultyCode).contains("ma khoa")) {
                    continue;
                }

                dictionary.put(facultyCode, facultyName);
            }
        }

        return dictionary;
    }

    private Sheet findDataSheet(Workbook workbook) {
        for (int sheetIndex = 0; sheetIndex < workbook.getNumberOfSheets(); sheetIndex++) {
            Sheet sheet = workbook.getSheetAt(sheetIndex);
            if (normalize(sheet.getSheetName()).contains("tu dien")) {
                continue;
            }

            if (findHeaderRow(sheet) != null) {
                return sheet;
            }
        }

        return workbook.getSheetAt(0);
    }

    private Row findHeaderRow(Sheet sheet) {
        int maxRowsToScan = Math.min(sheet.getLastRowNum(), 20);
        for (int index = 0; index <= maxRowsToScan; index++) {
            Row row = sheet.getRow(index);
            if (row == null) {
                continue;
            }

            for (Cell cell : row) {
                String header = normalize(readString(cell));
                if (header.contains("mssv") || header.contains("ma sinh vien") || header.contains("student id")) {
                    return row;
                }
            }
        }

        return sheet.getRow(0);
    }

    private ColumnIndexes resolveColumnIndexes(Row headerRow) {
        ColumnIndexes indexes = new ColumnIndexes();
        if (headerRow == null) {
            return indexes;
        }

        for (Cell cell : headerRow) {
            String header = normalize(readString(cell));
            int columnIndex = cell.getColumnIndex();

            if (header.contains("mssv") || header.contains("ma sinh vien") || header.contains("student id")) {
                indexes.studentIdIndex = columnIndex;
            } else if (header.contains("ho va ten") || header.contains("ho ten") || header.contains("full name")) {
                indexes.fullNameIndex = columnIndex;
                if (isBlank(readExistingString(headerRow, columnIndex + 1))) {
                    indexes.fullNameExtraIndex = columnIndex + 1;
                }
            } else if (header.contains("ngay sinh") || header.contains("date of birth")) {
                indexes.dobIndex = columnIndex;
            } else if (header.equals("lop") || header.contains("class")) {
                indexes.classCodeIndex = columnIndex;
            } else if (header.equals("khoa") || header.contains("faculty")) {
                indexes.facultyCodeIndex = columnIndex;
            } else if (header.contains("nien khoa") || header.contains("academic year")) {
                indexes.academicYearIndex = columnIndex;
            } else if (header.contains("gioi tinh") || header.contains("gender")) {
                indexes.genderIndex = columnIndex;
            } else if (header.contains("so dien thoai") || header.contains("sdt") || header.contains("phone")) {
                indexes.phoneIndex = columnIndex;
            }
        }

        return indexes;
    }

    private String joinName(String firstPart, String secondPart) {
        String first = clean(firstPart);
        String second = clean(secondPart);
        if (isBlank(second)) {
            return first;
        }
        return clean(first + " " + second);
    }

    private LocalDate parseDate(Row row, int columnIndex) {
        if (columnIndex < 0 || row == null) {
            return null;
        }

        Cell cell = row.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return null;
        }

        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getDateCellValue().toInstant()
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate();
        }

        String value = clean(readString(cell));
        if (isBlank(value)) {
            return null;
        }

        for (DateTimeFormatter dateFormatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(value, dateFormatter);
            } catch (DateTimeParseException ignored) {
                // Try the next supported Excel date format.
            }
        }

        return null;
    }

    private Integer parseStartYear(String academicYearName) {
        if (isBlank(academicYearName)) {
            return null;
        }

        Matcher matcher = YEAR_PATTERN.matcher(academicYearName);
        if (!matcher.find()) {
            return null;
        }

        return Integer.valueOf(matcher.group());
    }

    private String readString(Row row, int columnIndex) {
        if (row == null || columnIndex < 0) {
            return "";
        }
        return readString(row.getCell(columnIndex, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK));
    }

    private String readExistingString(Row row, int columnIndex) {
        if (row == null || columnIndex < 0) {
            return "";
        }
        return readString(row.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL));
    }

    private String readString(Cell cell) {
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell);
    }

    private UserProfile.Gender parseGender(String gender) {
        String normalized = normalize(gender);
        if (normalized.isBlank()) {
            return null;
        }
        if ("nam".equals(normalized) || "male".equals(normalized)) {
            return UserProfile.Gender.MALE;
        }
        if ("nu".equals(normalized) || "female".equals(normalized)) {
            return UserProfile.Gender.FEMALE;
        }
        return UserProfile.Gender.OTHER;
    }

    private String normalizeCode(String value) {
        return clean(value).toUpperCase(Locale.ROOT);
    }

    private String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").replace('đ', 'd');
    }

    private static class ColumnIndexes {
        private int studentIdIndex = 1;
        private int fullNameIndex = 2;
        private int fullNameExtraIndex = 3;
        private int dobIndex = 4;
        private int classCodeIndex = 5;
        private int facultyCodeIndex = 6;
        private int academicYearIndex = 8;
        private int genderIndex = -1;
        private int phoneIndex = -1;
    }
}
