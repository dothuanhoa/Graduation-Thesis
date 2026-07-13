package com.userservice.service.impl;

import com.userservice.client.AuthServiceClient;
import com.userservice.domain.Clazz;
import com.userservice.domain.StudentGroup;
import com.userservice.domain.UserProfile;
import com.userservice.dto.BulkStudentUpdateResponse;
import com.userservice.dto.BulkRegisterMessage;
import com.userservice.dto.OrganizationImportSummary;
import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;
import com.userservice.exception.BadRequestException;
import com.userservice.exception.ResourceNotFoundException;
import com.userservice.repository.ClassRepository;
import com.userservice.repository.StudentGroupRepository;
import com.userservice.repository.UserProfileRepository;
import com.userservice.service.OrganizationService;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private static final int PROFILE_BATCH_SIZE = 250;
    private static final int AUTH_BATCH_SIZE = 100;
    private static final int MAX_STUDENTS_PER_CLASS = 120;
    private static final String DEFAULT_STUDENT_GROUP_CODE = "1";

    private final UserProfileRepository userProfileRepository;
    private final ClassRepository classRepository;
    private final StudentGroupRepository studentGroupRepository;
    private final AuthServiceClient authServiceClient;
    private final OrganizationService organizationService;

    public List<UserProfile> findAll() {
        return userProfileRepository.findAll();
    }

    public Optional<UserProfile> findById(Long id) {
        return userProfileRepository.findById(id);
    }

    public Optional<UserProfile> findByStudentId(String studentId) {
        return userProfileRepository.findByStudentId(studentId);
    }

    public List<StudentGroup> findAllStudentGroups() {
        return studentGroupRepository.findAllByOrderByIdAsc();
    }

    @Transactional
    public UserProfile save(UserProfile userProfile) {
        Clazz targetClazz = resolveClazz(userProfile);
        StudentGroup targetGroup = resolveStudentGroupForCreate(userProfile);
        ensureClassHasRoom(null, targetClazz, 1);
        userProfile.setClazz(targetClazz);
        userProfile.setStudentGroup(targetGroup);
        UserProfile savedProfile = userProfileRepository.save(userProfile);
        createAuthAccount(savedProfile);
        return savedProfile;
    }

    public String bulkImport(List<StudentImportRow> rows) {
        return bulkImport(rows, null);
    }

    public String bulkImport(List<StudentImportRow> rows, Consumer<StudentImportProgress> progressConsumer) {
        OrganizationImportSummary organizationSummary = new OrganizationImportSummary();
        List<UserProfile> newProfiles = new ArrayList<>();
        List<UserProfile> updatedProfiles = new ArrayList<>();
        List<BulkRegisterMessage.UserAccountDTO> pendingAccounts = new ArrayList<>();
        Set<String> seenStudentIds = new HashSet<>();
        Map<String, UserProfile> existingProfiles = loadExistingProfiles(rows);
        Map<String, Clazz> classCache = new HashMap<>();
        Map<String, StudentGroup> studentGroupCache = loadStudentGroupCache();

        int totalRows = rows.size();
        int processedRows = 0;
        int createdStudents = 0;
        int updatedStudents = 0;
        int skippedStudents = 0;
        int authProcessed = 0;

        report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                authProcessed, 0, "Đang kiểm tra dữ liệu sinh viên.");

        for (StudentImportRow row : rows) {
            processedRows++;

            String studentId = clean(row.getStudentId());
            if (studentId.isBlank() || isBlank(row.getFullName()) || !seenStudentIds.add(studentId)) {
                skippedStudents++;
                reportIfNeeded(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents,
                        skippedStudents, authProcessed, 0, "Đang kiểm tra dữ liệu sinh viên.");
                continue;
            }

            row.setStudentId(studentId);
            pendingAccounts.add(new BulkRegisterMessage.UserAccountDTO(
                    studentId,
                    studentId + "@student.stu.edu.vn"
            ));
            Clazz clazz = resolveImportClass(row, organizationSummary, classCache);
            StudentGroup studentGroup = resolveImportStudentGroup(row, studentGroupCache);
            Optional<UserProfile> existingProfile = Optional.ofNullable(existingProfiles.get(studentId));

            if (existingProfile.isPresent()) {
                UserProfile profile = existingProfile.get();
                applyImportRow(profile, row, clazz, studentGroup);
                updatedProfiles.add(profile);
            } else {
                UserProfile profile = new UserProfile();
                profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);
                applyImportRow(profile, row, clazz, studentGroup);
                newProfiles.add(profile);
            }

            if (newProfiles.size() + updatedProfiles.size() >= PROFILE_BATCH_SIZE) {
                ImportCounters counters = saveProfileBatches(newProfiles, updatedProfiles);
                createdStudents += counters.createdStudents();
                updatedStudents += counters.updatedStudents();
            }

            reportIfNeeded(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents,
                    skippedStudents, authProcessed, 0, "Đang lưu hồ sơ sinh viên.");
        }

        ImportCounters counters = saveProfileBatches(newProfiles, updatedProfiles);
        createdStudents += counters.createdStudents();
        updatedStudents += counters.updatedStudents();

        if (createdStudents == 0 && updatedStudents == 0) {
            report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                    authProcessed, 0, "Không có hồ sơ sinh viên hợp lệ để import.");
            return "Không có hồ sơ sinh viên hợp lệ để import.";
        }

        int authTotal = pendingAccounts.size();
        report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                authProcessed, authTotal, "Đang tạo tài khoản đăng nhập cho sinh viên mới.");

        for (int start = 0; start < pendingAccounts.size(); start += AUTH_BATCH_SIZE) {
            int end = Math.min(start + AUTH_BATCH_SIZE, pendingAccounts.size());
            authServiceClient.bulkRegisterAccount(pendingAccounts.subList(start, end));
            authProcessed = end;
            report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                    authProcessed, authTotal, "Đang tạo tài khoản đăng nhập: " + authProcessed + "/" + authTotal + ".");
        }

        String result = organizationSummary.toStudentMessage(createdStudents, updatedStudents, skippedStudents);
        report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                authProcessed, authTotal, result);
        return result;
    }

    public UserProfile update(Long id, UserProfile userDetails) {
        return userProfileRepository.findById(id).map(user -> {
            Clazz targetClazz = resolveClazz(userDetails);
            StudentGroup targetGroup = resolveStudentGroupForUpdate(user, userDetails);
            ensureClassHasRoom(user, targetClazz, 1);
            user.setFullName(userDetails.getFullName());
            user.setStudentId(userDetails.getStudentId());
            user.setDob(userDetails.getDob());
            user.setGender(userDetails.getGender());
            user.setContactPhone(userDetails.getContactPhone());
            user.setClazz(targetClazz);
            user.setStudentGroup(targetGroup);
            user.setStudentStatus(userDetails.getStudentStatus());
            return userProfileRepository.save(user);
        }).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên với id: " + id));
    }

    @Transactional
    public BulkStudentUpdateResponse assignStudentsToClass(List<Long> studentIds, Long classId) {
        Clazz targetClazz = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp với id: " + classId));
        if (targetClazz.getStatus() != Clazz.Status.ACTIVE) {
            throw new BadRequestException("Lớp " + targetClazz.getClassCode() + " đang ngưng hoạt động.");
        }

        List<UserProfile> students = loadStudentsByIds(studentIds);
        int incomingCount = (int) students.stream()
                .filter(student -> !sameClass(student.getClazz(), targetClazz))
                .count();
        ensureClassHasRoom(null, targetClazz, incomingCount);

        students.forEach(student -> student.setClazz(targetClazz));
        userProfileRepository.saveAll(students);
        return new BulkStudentUpdateResponse(
                students.size(),
                "Đã chuyển " + students.size() + " sinh viên vào lớp " + targetClazz.getClassCode() + "."
        );
    }

    @Transactional
    public BulkStudentUpdateResponse updateStudentStatuses(List<Long> studentIds, UserProfile.StudentStatus status) {
        List<UserProfile> students = loadStudentsByIds(studentIds);
        students.forEach(student -> student.setStudentStatus(status));
        userProfileRepository.saveAll(students);
        return new BulkStudentUpdateResponse(
                students.size(),
                "Đã cập nhật trạng thái cho " + students.size() + " sinh viên."
        );
    }

    public void delete(Long id) {
        if (!userProfileRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên với id: " + id);
        }
        userProfileRepository.deleteById(id);
    }

    @Transactional
    public UserProfile updateContactByStudentId(String studentId, String contactPhone) {
        UserProfile user = userProfileRepository.findByStudentId(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên với MSSV: " + studentId));

        user.setContactPhone(contactPhone);
        return userProfileRepository.save(user);
    }

    private ImportCounters saveProfileBatches(
            List<UserProfile> newProfiles,
            List<UserProfile> updatedProfiles
    ) {
        int createdStudents = 0;
        int updatedStudents = 0;

        if (!newProfiles.isEmpty()) {
            List<UserProfile> savedNewProfiles = userProfileRepository.saveAll(newProfiles);
            createdStudents = savedNewProfiles.size();
            newProfiles.clear();
        }

        if (!updatedProfiles.isEmpty()) {
            userProfileRepository.saveAll(updatedProfiles);
            updatedStudents = updatedProfiles.size();
            updatedProfiles.clear();
        }

        return new ImportCounters(createdStudents, updatedStudents);
    }

    private Map<String, UserProfile> loadExistingProfiles(List<StudentImportRow> rows) {
        Set<String> studentIds = rows.stream()
                .map(row -> clean(row.getStudentId()))
                .filter(studentId -> !studentId.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (studentIds.isEmpty()) {
            return new HashMap<>();
        }

        return userProfileRepository.findByStudentIdIn(studentIds)
                .stream()
                .collect(Collectors.toMap(UserProfile::getStudentId, Function.identity()));
    }

    private Clazz resolveImportClass(
            StudentImportRow row,
            OrganizationImportSummary organizationSummary,
            Map<String, Clazz> classCache
    ) {
        String classCode = clean(row.getClassCode()).toUpperCase(Locale.ROOT);
        if (classCode.isBlank()) {
            return organizationService.ensureClass(row, organizationSummary);
        }

        return classCache.computeIfAbsent(classCode, ignored -> organizationService.ensureClass(row, organizationSummary));
    }

    private StudentGroup resolveImportStudentGroup(StudentImportRow row, Map<String, StudentGroup> studentGroupCache) {
        String groupCode = clean(row.getStudentGroupCode());
        if (groupCode.isBlank()) {
            groupCode = DEFAULT_STUDENT_GROUP_CODE;
        }

        StudentGroup studentGroup = studentGroupCache.get(groupCode);
        if (studentGroup == null) {
            throw new BadRequestException("Mã nhóm sinh viên không hợp lệ: " + groupCode
                    + ". Chỉ hỗ trợ 1=Đầu khóa, 2=Giữa khóa, 3=Cuối khóa.");
        }
        return studentGroup;
    }

    private Map<String, StudentGroup> loadStudentGroupCache() {
        return studentGroupRepository.findAll().stream()
                .collect(Collectors.toMap(StudentGroup::getCode, Function.identity()));
    }

    private void createAuthAccount(UserProfile profile) {
        authServiceClient.registerAccount(new AuthServiceClient.RegisterRequest(
                profile.getStudentId(),
                profile.getStudentId() + "@student.stu.edu.vn"
        ));
    }

    private Clazz resolveClazz(UserProfile userProfile) {
        if (userProfile.getClazz() == null || userProfile.getClazz().getId() == null) {
            return null;
        }

        return classRepository.findById(userProfile.getClazz().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp với id: " + userProfile.getClazz().getId()));
    }

    private StudentGroup resolveStudentGroupForCreate(UserProfile userProfile) {
        return resolveStudentGroup(userProfile == null ? null : userProfile.getStudentGroup())
                .orElseGet(this::defaultStudentGroup);
    }

    private StudentGroup resolveStudentGroupForUpdate(UserProfile currentUser, UserProfile userDetails) {
        if (userDetails.getStudentGroup() == null) {
            return currentUser.getStudentGroup() == null ? defaultStudentGroup() : currentUser.getStudentGroup();
        }
        return resolveStudentGroup(userDetails.getStudentGroup()).orElseGet(this::defaultStudentGroup);
    }

    private Optional<StudentGroup> resolveStudentGroup(StudentGroup requestedGroup) {
        if (requestedGroup == null) {
            return Optional.empty();
        }

        if (requestedGroup.getId() != null) {
            return Optional.of(studentGroupRepository.findById(requestedGroup.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm sinh viên với id: " + requestedGroup.getId())));
        }

        String code = clean(requestedGroup.getCode());
        if (!code.isBlank()) {
            return Optional.of(studentGroupRepository.findByCode(code)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm sinh viên với mã: " + code)));
        }

        return Optional.empty();
    }

    private StudentGroup defaultStudentGroup() {
        return studentGroupRepository.findByCode(DEFAULT_STUDENT_GROUP_CODE)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa khởi tạo nhóm sinh viên mặc định."));
    }

    private List<UserProfile> loadStudentsByIds(List<Long> studentIds) {
        LinkedHashSet<Long> uniqueIds = studentIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (uniqueIds.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một sinh viên.");
        }

        List<UserProfile> students = userProfileRepository.findAllById(uniqueIds);
        Set<Long> foundIds = students.stream()
                .map(UserProfile::getId)
                .collect(Collectors.toSet());
        List<Long> missingIds = uniqueIds.stream()
                .filter(id -> !foundIds.contains(id))
                .toList();
        if (!missingIds.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy sinh viên với id: " + missingIds);
        }

        return students;
    }

    private void ensureClassHasRoom(UserProfile currentStudent, Clazz targetClazz, int incomingCount) {
        if (targetClazz == null || incomingCount <= 0) {
            return;
        }

        if (targetClazz.getStatus() != Clazz.Status.ACTIVE) {
            throw new BadRequestException("Lớp " + targetClazz.getClassCode() + " đang ngưng hoạt động.");
        }

        if (currentStudent != null && sameClass(currentStudent.getClazz(), targetClazz)) {
            return;
        }

        long currentCount = userProfileRepository.countByClazzId(targetClazz.getId());
        long nextCount = currentCount + incomingCount;
        if (nextCount > MAX_STUDENTS_PER_CLASS) {
            throw new BadRequestException("Lớp " + targetClazz.getClassCode()
                    + " tối đa " + MAX_STUDENTS_PER_CLASS
                    + " sinh viên. Hiện có " + currentCount
                    + ", chỉ có thể chuyển thêm "
                    + Math.max(0, MAX_STUDENTS_PER_CLASS - currentCount)
                    + " sinh viên.");
        }
    }

    private boolean sameClass(Clazz currentClazz, Clazz targetClazz) {
        return currentClazz != null
                && targetClazz != null
                && Objects.equals(currentClazz.getId(), targetClazz.getId());
    }

    private void applyImportRow(UserProfile profile, StudentImportRow row, Clazz clazz, StudentGroup studentGroup) {
        profile.setStudentId(clean(row.getStudentId()));
        profile.setFullName(clean(row.getFullName()));

        if (row.getDob() != null) {
            profile.setDob(row.getDob());
        }
        if (row.getGender() != null) {
            profile.setGender(row.getGender());
        }
        if (!isBlank(row.getContactPhone())) {
            profile.setContactPhone(clean(row.getContactPhone()));
        }
        if (clazz != null) {
            profile.setClazz(clazz);
        }
        profile.setStudentGroup(studentGroup);
        if (profile.getStudentStatus() == null) {
            profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);
        }
    }

    private void reportIfNeeded(
            Consumer<StudentImportProgress> progressConsumer,
            int totalRows,
            int processedRows,
            int createdStudents,
            int updatedStudents,
            int skippedStudents,
            int authProcessed,
            int authTotal,
            String message
    ) {
        if (processedRows == totalRows || processedRows % 50 == 0) {
            report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents,
                    skippedStudents, authProcessed, authTotal, message);
        }
    }

    private void report(
            Consumer<StudentImportProgress> progressConsumer,
            int totalRows,
            int processedRows,
            int createdStudents,
            int updatedStudents,
            int skippedStudents,
            int authProcessed,
            int authTotal,
            String message
    ) {
        if (progressConsumer == null) {
            return;
        }

        progressConsumer.accept(StudentImportProgress.builder()
                .totalRows(totalRows)
                .processedRows(processedRows)
                .createdStudents(createdStudents)
                .updatedStudents(updatedStudents)
                .skippedStudents(skippedStudents)
                .authProcessed(authProcessed)
                .authTotal(authTotal)
                .progressPercent(calculateProgress(totalRows, processedRows, authTotal, authProcessed))
                .message(message)
                .build());
    }

    private int calculateProgress(int totalRows, int processedRows, int authTotal, int authProcessed) {
        int rowProgress = totalRows == 0 ? 70 : (processedRows * 70) / totalRows;
        int authProgress = authTotal == 0 ? 0 : (authProcessed * 30) / authTotal;
        return Math.min(99, rowProgress + authProgress);
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

    private record ImportCounters(int createdStudents, int updatedStudents) {
    }
}
