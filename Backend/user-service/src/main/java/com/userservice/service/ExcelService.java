package com.userservice.service;

import com.userservice.domain.UserProfile;
import com.userservice.dto.StudentImportRow;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
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

    public byte[] createStudentImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet dataSheet = workbook.createSheet("DSSV HK23.2_25.03.24");
            Sheet facultySheet = workbook.createSheet("Từ điển khoa");
            Sheet groupSheet = workbook.createSheet("Từ điển nhóm");
            CellStyle dataHeaderStyle = createTableHeaderStyle(workbook);
            CellStyle dataBodyStyle = createTableBodyStyle(workbook);
            CellStyle dictionaryStyle = createDictionaryStyle(workbook);

            dataSheet.addMergedRegion(new CellRangeAddress(0, 0, 2, 3));
            writeRow(dataSheet.createRow(0), dataHeaderStyle,
                    "STT",
                    "MSSV",
                    "Họ và tên",
                    "",
                    "Email",
                    "Ngày sinh",
                    "Lớp",
                    "Khoa",
                    "Hệ đào tạo",
                    "Niên khóa",
                    "Ghi chú",
                    "Nhóm");
            writeRow(dataSheet.createRow(1), dataBodyStyle,
                    "1",
                    "DH12107793",
                    "Nguyễn Hoài",
                    "An",
                    "dh12107793@student.edu.vn",
                    "04/06/2003",
                    "D21_CDTU01",
                    "ckhi",
                    "Đại học",
                    "2021-2025",
                    "",
                    "3");
            writeRow(dataSheet.createRow(2), dataBodyStyle,
                    "2",
                    "DH12112144",
                    "Nguyễn Văn",
                    "Bảo",
                    "dh12112144@student.edu.vn",
                    "08/09/2003",
                    "D21_CDTU01",
                    "ckhi",
                    "Đại học",
                    "2021-2025",
                    "",
                    "3");
            writeRow(dataSheet.createRow(3), dataBodyStyle,
                    "3",
                    "DH52201258",
                    "Trần Thanh Hoài",
                    "Phúc",
                    "dh52201258@student.edu.vn",
                    "23/06/2004",
                    "D22_TH04",
                    "cntt",
                    "Đại học",
                    "2022-2026",
                    "",
                    "2");

            writeRow(facultySheet.createRow(0), dictionaryStyle, "Mã khoa trong hệ thống", "");
            writeRow(facultySheet.createRow(1), dictionaryStyle, "Tên khoa", "Mã khoa");
            writeRow(facultySheet.createRow(2), dictionaryStyle, "Cơ khí", "ckhi");
            writeRow(facultySheet.createRow(3), dictionaryStyle, "Công nghệ thực phẩm", "cntp");
            writeRow(facultySheet.createRow(4), dictionaryStyle, "Công nghệ thông tin", "cntt");
            writeRow(facultySheet.createRow(5), dictionaryStyle, "Điện - Điện tử", "ddtu");
            writeRow(facultySheet.createRow(6), dictionaryStyle, "Design", "dsgn");
            writeRow(facultySheet.createRow(7), dictionaryStyle, "Kỹ thuật công trình", "ktct");
            writeRow(facultySheet.createRow(8), dictionaryStyle, "Quản trị kinh doanh", "qtkd");

            writeRow(groupSheet.createRow(0), dictionaryStyle, "Nhóm", "");
            writeRow(groupSheet.createRow(1), dictionaryStyle, "Tên nhóm", "Mã nhóm");
            writeRow(groupSheet.createRow(2), dictionaryStyle, "Quản trị", "0");
            writeRow(groupSheet.createRow(3), dictionaryStyle, "Đầu khóa", "1");
            writeRow(groupSheet.createRow(4), dictionaryStyle, "Giữa khóa", "2");
            writeRow(groupSheet.createRow(5), dictionaryStyle, "Cuối khóa", "3");

            setStudentTemplateWidths(dataSheet);
            facultySheet.setColumnWidth(0, 20 * 256);
            facultySheet.setColumnWidth(1, 12 * 256);
            groupSheet.setColumnWidth(0, 16 * 256);
            groupSheet.setColumnWidth(1, 10 * 256);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Không tạo được file mẫu Excel: " + e.getMessage(), e);
        }
    }

    private List<StudentImportRow> parseWorkbook(Workbook workbook) {
        Map<String, String> facultyDictionary = readFacultyDictionary(workbook);
        Map<String, String> studentGroupDictionary = readStudentGroupDictionary(workbook);
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

            StudentImportRow item = parseRow(row, columns, facultyDictionary, studentGroupDictionary);
            if (!isBlank(item.getStudentId()) || !isBlank(item.getClassCode())
                    || !isBlank(item.getFacultyCode()) || !isBlank(item.getAcademicYearName())) {
                rows.add(item);
            }
        }

        return rows;
    }

    private StudentImportRow parseRow(
            Row row,
            ColumnIndexes columns,
            Map<String, String> facultyDictionary,
            Map<String, String> studentGroupDictionary
    ) {
        String studentId = clean(readString(row, columns.studentIdIndex));
        String fullName = clean(joinName(readString(row, columns.fullNameIndex), readString(row, columns.fullNameExtraIndex)));
        String email = clean(readString(row, columns.emailIndex)).toLowerCase(Locale.ROOT);
        String classCode = normalizeCode(readString(row, columns.classCodeIndex));
        String facultyCode = normalizeCode(readString(row, columns.facultyCodeIndex));
        String academicYearName = clean(readString(row, columns.academicYearIndex));
        String studentGroupCode = resolveStudentGroupCode(readString(row, columns.studentGroupIndex), studentGroupDictionary);
        String facultyName = facultyDictionary.getOrDefault(facultyCode, facultyCode);

        return StudentImportRow.builder()
                .studentId(studentId)
                .fullName(fullName)
                .email(email)
                .dob(parseDate(row, columns.dobIndex))
                .gender(parseGender(readString(row, columns.genderIndex)))
                .contactPhone(clean(readString(row, columns.phoneIndex)))
                .classCode(classCode)
                .facultyCode(facultyCode)
                .facultyName(clean(facultyName))
                .academicYearName(academicYearName)
                .academicYearStartYear(parseStartYear(academicYearName))
                .studentGroupCode(studentGroupCode)
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

    private Map<String, String> readStudentGroupDictionary(Workbook workbook) {
        Map<String, String> dictionary = new HashMap<>();

        for (int sheetIndex = 0; sheetIndex < workbook.getNumberOfSheets(); sheetIndex++) {
            Sheet sheet = workbook.getSheetAt(sheetIndex);
            if (!normalize(sheet.getSheetName()).contains("tu dien nhom")) {
                continue;
            }

            for (Row row : sheet) {
                String groupName = clean(readString(row, 0));
                String groupCode = normalizeGroupCode(readString(row, 1));
                String normalizedName = normalize(groupName);

                if (isBlank(groupName) || isBlank(groupCode)
                        || normalizedName.contains("ten nhom")
                        || normalize(groupCode).contains("ma nhom")) {
                    continue;
                }

                dictionary.put(groupCode, groupCode);
                dictionary.put(normalizedName, groupCode);
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
            } else if (header.equals("email") || header.contains("mail sinh vien") || header.contains("student email")) {
                indexes.emailIndex = columnIndex;
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
            } else if (header.equals("nhom") || header.contains("ma nhom") || header.contains("group")) {
                indexes.studentGroupIndex = columnIndex;
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

    private String normalizeGroupCode(String value) {
        String code = clean(value);
        if (code.endsWith(".0")) {
            code = code.substring(0, code.length() - 2);
        }
        return code;
    }

    private String resolveStudentGroupCode(String value, Map<String, String> studentGroupDictionary) {
        String groupCode = normalizeGroupCode(value);
        if (isBlank(groupCode)) {
            return "";
        }
        String normalizedName = normalize(groupCode);
        return studentGroupDictionary.getOrDefault(groupCode, studentGroupDictionary.getOrDefault(normalizedName, groupCode));
    }

    private CellStyle createTableHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontName("Times New Roman");
        font.setFontHeightInPoints((short) 9);
        font.setBold(true);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setThinBorder(style);
        return style;
    }

    private CellStyle createTableBodyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontName("Times New Roman");
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setThinBorder(style);
        return style;
    }

    private CellStyle createDictionaryStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontName("Times New Roman");
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        return style;
    }

    private void setThinBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
    }

    private void setStudentTemplateWidths(Sheet sheet) {
        int[] widths = {6, 12, 21, 9, 28, 11, 13, 12, 14, 12, 12, 12};
        for (int index = 0; index < widths.length; index++) {
            sheet.setColumnWidth(index, widths[index] * 256);
        }
    }

    private void writeRow(Row row, CellStyle style, String... values) {
        for (int index = 0; index < values.length; index++) {
            Cell cell = row.createCell(index);
            cell.setCellValue(values[index]);
            if (style != null) {
                cell.setCellStyle(style);
            }
        }
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
        private int emailIndex = -1;
        private int dobIndex = 5;
        private int classCodeIndex = 6;
        private int facultyCodeIndex = 7;
        private int academicYearIndex = 9;
        private int studentGroupIndex = 11;
        private int genderIndex = -1;
        private int phoneIndex = -1;
    }
}
