package com.userservice.service;

import com.userservice.domain.AcademicYear;
import com.userservice.domain.Clazz;
import com.userservice.domain.Faculty;
import com.userservice.dto.AcademicYearRequest;
import com.userservice.dto.AcademicYearResponse;
import com.userservice.dto.ClassRequest;
import com.userservice.dto.ClassResponse;
import com.userservice.dto.FacultyRequest;
import com.userservice.dto.FacultyResponse;
import com.userservice.dto.OrganizationImportSummary;
import com.userservice.dto.StudentImportRow;
import com.userservice.exception.BadRequestException;
import com.userservice.exception.ResourceNotFoundException;
import com.userservice.repository.AcademicYearRepository;
import com.userservice.repository.ClassRepository;
import com.userservice.repository.FacultyRepository;
import com.userservice.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrganizationService {
    private final FacultyRepository facultyRepository;
    private final ClassRepository classRepository;
    private final AcademicYearRepository academicYearRepository;
    private final UserProfileRepository userProfileRepository;

    public List<FacultyResponse> getFaculties() {
        return facultyRepository.findAllByOrderByFacultyCodeAsc()
                .stream()
                .map(this::toFacultyResponse)
                .toList();
    }

    @Transactional
    public FacultyResponse createFaculty(FacultyRequest request) {
        String facultyCode = normalizeCode(request.getFacultyCode());
        if (facultyRepository.existsByFacultyCodeIgnoreCase(facultyCode)) {
            throw new BadRequestException("Mã khoa " + facultyCode + " đã tồn tại");
        }

        Faculty faculty = new Faculty();
        applyFacultyRequest(faculty, request);
        return toFacultyResponse(facultyRepository.save(faculty));
    }

    @Transactional
    public FacultyResponse updateFaculty(Long id, FacultyRequest request) {
        Faculty faculty = facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khoa"));
        String facultyCode = normalizeCode(request.getFacultyCode());
        if (facultyRepository.existsByFacultyCodeIgnoreCaseAndIdNot(facultyCode, id)) {
            throw new BadRequestException("Mã khoa " + facultyCode + " đã tồn tại");
        }

        applyFacultyRequest(faculty, request);
        return toFacultyResponse(facultyRepository.save(faculty));
    }

    @Transactional
    public void deleteFaculty(Long id) {
        Faculty faculty = facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khoa"));

        if (classRepository.countByFacultyId(id) > 0 || userProfileRepository.countByClazzFacultyId(id) > 0) {
            throw new BadRequestException("Khoa đang có lớp hoặc sinh viên nên không thể xóa");
        }

        facultyRepository.delete(faculty);
    }

    public List<ClassResponse> getClasses() {
        return classRepository.findAllByOrderByClassCodeAsc()
                .stream()
                .map(this::toClassResponse)
                .toList();
    }

    @Transactional
    public ClassResponse createClass(ClassRequest request) {
        String classCode = normalizeCode(request.getClassCode());
        if (classRepository.existsByClassCodeIgnoreCase(classCode)) {
            throw new BadRequestException("Mã lớp " + classCode + " đã tồn tại");
        }

        Clazz clazz = new Clazz();
        applyClassRequest(clazz, request);
        return toClassResponse(classRepository.save(clazz));
    }

    @Transactional
    public ClassResponse updateClass(Long id, ClassRequest request) {
        Clazz clazz = classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp"));
        String classCode = normalizeCode(request.getClassCode());
        if (classRepository.existsByClassCodeIgnoreCaseAndIdNot(classCode, id)) {
            throw new BadRequestException("Mã lớp " + classCode + " đã tồn tại");
        }

        applyClassRequest(clazz, request);
        return toClassResponse(classRepository.save(clazz));
    }

    @Transactional
    public void deleteClass(Long id) {
        Clazz clazz = classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp"));

        if (userProfileRepository.existsByClazzId(id)) {
            throw new BadRequestException("Lớp đang có sinh viên nên không thể xóa");
        }

        classRepository.delete(clazz);
    }

    public List<AcademicYearResponse> getAcademicYears() {
        return academicYearRepository.findAllByOrderByYearNameAsc()
                .stream()
                .map(this::toAcademicYearResponse)
                .toList();
    }

    @Transactional
    public OrganizationImportSummary importFaculties(List<StudentImportRow> rows) {
        OrganizationImportSummary summary = new OrganizationImportSummary();
        Set<String> seenFacultyCodes = new HashSet<>();

        for (StudentImportRow row : rows) {
            String facultyCode = normalizeCode(row.getFacultyCode());
            if (facultyCode.isBlank() || !seenFacultyCodes.add(facultyCode)) {
                continue;
            }
            ensureFaculty(facultyCode, row.getFacultyName(), summary);
        }

        return summary;
    }

    @Transactional
    public OrganizationImportSummary importAcademicYears(List<StudentImportRow> rows) {
        OrganizationImportSummary summary = new OrganizationImportSummary();
        Set<String> seenAcademicYears = new HashSet<>();

        for (StudentImportRow row : rows) {
            String yearName = clean(row.getAcademicYearName());
            if (yearName.isBlank() || !seenAcademicYears.add(yearName.toLowerCase(Locale.ROOT))) {
                continue;
            }
            ensureAcademicYear(yearName, row.getAcademicYearStartYear(), summary);
        }

        return summary;
    }

    @Transactional
    public OrganizationImportSummary importClasses(List<StudentImportRow> rows) {
        OrganizationImportSummary summary = new OrganizationImportSummary();
        Set<String> seenClassCodes = new HashSet<>();

        for (StudentImportRow row : rows) {
            String classCode = normalizeCode(row.getClassCode());
            if (classCode.isBlank() || !seenClassCodes.add(classCode)) {
                continue;
            }
            ensureClass(row, summary);
        }

        return summary;
    }

    @Transactional
    public AcademicYearResponse createAcademicYear(AcademicYearRequest request) {
        String yearName = request.getYearName().trim();
        if (academicYearRepository.existsByYearNameIgnoreCase(yearName)) {
            throw new BadRequestException("Niên khóa " + yearName + " đã tồn tại");
        }

        AcademicYear academicYear = new AcademicYear();
        applyAcademicYearRequest(academicYear, request);
        return toAcademicYearResponse(academicYearRepository.save(academicYear));
    }

    @Transactional
    public AcademicYearResponse updateAcademicYear(Long id, AcademicYearRequest request) {
        AcademicYear academicYear = academicYearRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy niên khóa"));
        String yearName = request.getYearName().trim();
        if (academicYearRepository.existsByYearNameIgnoreCaseAndIdNot(yearName, id)) {
            throw new BadRequestException("Niên khóa " + yearName + " đã tồn tại");
        }

        applyAcademicYearRequest(academicYear, request);
        return toAcademicYearResponse(academicYearRepository.save(academicYear));
    }

    @Transactional
    public void deleteAcademicYear(Long id) {
        AcademicYear academicYear = academicYearRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy niên khóa"));

        if (classRepository.countByAcademicYearId(id) > 0) {
            throw new BadRequestException("Niên khóa đang được lớp sử dụng nên không thể xóa");
        }

        academicYearRepository.delete(academicYear);
    }

    private void applyFacultyRequest(Faculty faculty, FacultyRequest request) {
        faculty.setFacultyCode(normalizeCode(request.getFacultyCode()));
        faculty.setFacultyName(request.getFacultyName().trim());
        faculty.setStatus(request.getStatus());
    }

    private void applyClassRequest(Clazz clazz, ClassRequest request) {
        Long facultyId = parseId(request.getFacultyId(), "Khoa không hợp lệ");
        Faculty faculty = facultyRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khoa"));

        clazz.setClassCode(normalizeCode(request.getClassCode()));
        clazz.setFaculty(faculty);
        clazz.setAcademicYear(resolveAcademicYear(request));
        clazz.setStatus(request.getStatus());
    }

    private void applyAcademicYearRequest(AcademicYear academicYear, AcademicYearRequest request) {
        academicYear.setYearName(request.getYearName().trim());
        academicYear.setStartYear(request.getStartYear());
    }

    public Faculty ensureFaculty(String facultyCode, String facultyName, OrganizationImportSummary summary) {
        String cleanFacultyCode = normalizeCode(facultyCode);
        String cleanFacultyName = clean(facultyName);

        if (cleanFacultyCode.isBlank()) {
            if (summary != null) summary.facultySkipped();
            return null;
        }

        Faculty faculty = facultyRepository.findByFacultyCodeIgnoreCase(cleanFacultyCode).orElse(null);
        if (faculty == null) {
            Faculty newFaculty = new Faculty();
            newFaculty.setFacultyCode(cleanFacultyCode);
            newFaculty.setFacultyName(cleanFacultyName.isBlank() ? cleanFacultyCode : cleanFacultyName);
            newFaculty.setStatus(Faculty.Status.ACTIVE);
            if (summary != null) summary.facultyCreated();
            return facultyRepository.save(newFaculty);
        }

        if (shouldUpdateFacultyName(faculty, cleanFacultyName)) {
            faculty.setFacultyName(cleanFacultyName);
            faculty.setStatus(Faculty.Status.ACTIVE);
            if (summary != null) summary.facultyUpdated();
            return facultyRepository.save(faculty);
        }

        if (summary != null) summary.facultySkipped();
        return faculty;
    }

    public AcademicYear ensureAcademicYear(String academicYearName, Integer startYear, OrganizationImportSummary summary) {
        String yearName = clean(academicYearName);
        if (yearName.isBlank()) {
            if (summary != null) summary.academicYearSkipped();
            return null;
        }

        return academicYearRepository.findByYearNameIgnoreCase(yearName)
                .map(existing -> {
                    if (summary != null) summary.academicYearSkipped();
                    return existing;
                })
                .orElseGet(() -> {
                    AcademicYear academicYear = new AcademicYear();
                    academicYear.setYearName(yearName);
                    academicYear.setStartYear(startYear);
                    if (summary != null) summary.academicYearCreated();
                    return academicYearRepository.save(academicYear);
                });
    }

    public Clazz ensureClass(StudentImportRow row, OrganizationImportSummary summary) {
        String classCode = normalizeCode(row.getClassCode());
        if (classCode.isBlank()) {
            if (summary != null) summary.classSkipped();
            return null;
        }

        Faculty faculty = ensureFaculty(row.getFacultyCode(), row.getFacultyName(), summary);
        AcademicYear academicYear = ensureAcademicYear(row.getAcademicYearName(), row.getAcademicYearStartYear(), summary);

        Clazz clazz = classRepository.findByClassCodeIgnoreCase(classCode).orElse(null);
        if (clazz == null) {
            Clazz newClazz = new Clazz();
            newClazz.setClassCode(classCode);
            newClazz.setFaculty(faculty);
            newClazz.setAcademicYear(academicYear);
            newClazz.setStatus(Clazz.Status.ACTIVE);
            if (summary != null) summary.classCreated();
            return classRepository.save(newClazz);
        }

        boolean changed = false;
        if (faculty != null && (clazz.getFaculty() == null || !Objects.equals(clazz.getFaculty().getId(), faculty.getId()))) {
            clazz.setFaculty(faculty);
            changed = true;
        }
        if (academicYear != null && (clazz.getAcademicYear() == null || !Objects.equals(clazz.getAcademicYear().getId(), academicYear.getId()))) {
            clazz.setAcademicYear(academicYear);
            changed = true;
        }
        if (clazz.getStatus() != Clazz.Status.ACTIVE) {
            clazz.setStatus(Clazz.Status.ACTIVE);
            changed = true;
        }

        if (changed) {
            if (summary != null) summary.classUpdated();
            return classRepository.save(clazz);
        }

        if (summary != null) summary.classSkipped();
        return clazz;
    }

    private AcademicYear resolveAcademicYear(ClassRequest request) {
        if (request.getAcademicYearId() != null && !request.getAcademicYearId().isBlank()) {
            Long academicYearId = parseId(request.getAcademicYearId(), "Niên khóa không hợp lệ");
            return academicYearRepository.findById(academicYearId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy niên khóa"));
        }

        if (request.getAcademicYearName() == null || request.getAcademicYearName().isBlank()) {
            return null;
        }

        String yearName = request.getAcademicYearName().trim();
        return academicYearRepository.findByYearNameIgnoreCase(yearName)
                .orElseGet(() -> {
                    AcademicYear academicYear = new AcademicYear();
                    academicYear.setYearName(yearName);
                    academicYear.setStartYear(request.getStartYear());
                    return academicYearRepository.save(academicYear);
                });
    }

    private FacultyResponse toFacultyResponse(Faculty faculty) {
        return FacultyResponse.builder()
                .id(String.valueOf(faculty.getId()))
                .facultyCode(faculty.getFacultyCode())
                .facultyName(faculty.getFacultyName())
                .status(faculty.getStatus())
                .classCount(classRepository.countByFacultyId(faculty.getId()))
                .studentCount(userProfileRepository.countByClazzFacultyId(faculty.getId()))
                .build();
    }

    private ClassResponse toClassResponse(Clazz clazz) {
        Faculty faculty = clazz.getFaculty();
        AcademicYear academicYear = clazz.getAcademicYear();

        return ClassResponse.builder()
                .id(String.valueOf(clazz.getId()))
                .classCode(clazz.getClassCode())
                .faculty(faculty == null ? null : ClassResponse.FacultySummary.builder()
                        .id(String.valueOf(faculty.getId()))
                        .facultyCode(faculty.getFacultyCode())
                        .facultyName(faculty.getFacultyName())
                        .build())
                .academicYear(academicYear == null ? null : toAcademicYearResponse(academicYear))
                .status(clazz.getStatus())
                .studentCount(userProfileRepository.countByClazzId(clazz.getId()))
                .build();
    }

    private AcademicYearResponse toAcademicYearResponse(AcademicYear academicYear) {
        return AcademicYearResponse.builder()
                .id(String.valueOf(academicYear.getId()))
                .yearName(academicYear.getYearName())
                .startYear(academicYear.getStartYear())
                .classCount(classRepository.countByAcademicYearId(academicYear.getId()))
                .build();
    }

    private boolean shouldUpdateFacultyName(Faculty faculty, String newFacultyName) {
        if (newFacultyName.isBlank() || newFacultyName.equals(faculty.getFacultyName())) {
            return false;
        }

        String currentName = faculty.getFacultyName();
        return currentName == null
                || currentName.isBlank()
                || currentName.equalsIgnoreCase(faculty.getFacultyCode());
    }

    private String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeCode(String value) {
        return clean(value).toUpperCase(Locale.ROOT);
    }

    private Long parseId(String value, String message) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BadRequestException(message);
        }
    }
}
