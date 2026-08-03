package com.userservice.service.impl;

import com.userservice.client.AuthServiceClient;
import com.userservice.domain.Clazz;
import com.userservice.domain.StudentGroup;
import com.userservice.domain.UserProfile;
import com.userservice.dto.BulkStudentGroupRequest;
import com.userservice.dto.BulkStudentUpdateResponse;
import com.userservice.dto.FaceVerificationResponse;
import com.userservice.dto.BulkRegisterMessage;
import com.userservice.dto.OrganizationImportSummary;
import com.userservice.dto.StudentFaceImage;
import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;
import com.userservice.exception.BadRequestException;
import com.userservice.exception.ResourceNotFoundException;
import com.userservice.repository.AcademicYearRepository;
import com.userservice.repository.ClassRepository;
import com.userservice.repository.StudentGroupRepository;
import com.userservice.repository.UserProfileRepository;
import com.userservice.service.OrganizationService;
import com.userservice.service.UserService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.CompareFacesRequest;
import software.amazon.awssdk.services.rekognition.model.CompareFacesResponse;
import software.amazon.awssdk.services.rekognition.model.CompareFacesMatch;
import software.amazon.awssdk.services.rekognition.model.Image;
import software.amazon.awssdk.services.rekognition.model.RekognitionException;
import software.amazon.awssdk.services.rekognition.model.S3Object;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Year;
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
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private static final int PROFILE_BATCH_SIZE = 250;
    private static final int AUTH_BATCH_SIZE = 100;
    private static final int AUTH_SYNC_MAX_ATTEMPTS = 3;
    private static final long AUTH_SYNC_RETRY_DELAY_MS = 200L;
    private static final int MAX_STUDENTS_PER_CLASS = 120;
    private static final String DEFAULT_STUDENT_GROUP_CODE = "1";
    private static final String INTERNAL_ADMIN_ROLE = "ADMIN";

    private final UserProfileRepository userProfileRepository;
    private final ClassRepository classRepository;
    private final AcademicYearRepository academicYearRepository;
    private final StudentGroupRepository studentGroupRepository;
    private final AuthServiceClient authServiceClient;
    private final OrganizationService organizationService;

    @Value("${app.student.email-domain:student.edu.vn}")
    private String studentEmailDomain;

    @Value("${app.student-face.upload-dir:uploads/student-faces}")
    private String studentFaceUploadDir;

    @Value("${app.student-face.storage-provider:local}")
    private String studentFaceStorageProvider;

    @Value("${app.student-face.s3-bucket:}")
    private String studentFaceS3Bucket;

    @Value("${app.student-face.s3-region:ap-southeast-1}")
    private String studentFaceS3Region;

    @Value("${app.student-face.s3-prefix:student-faces}")
    private String studentFaceS3Prefix;

    @Value("${app.student-face.rekognition-region:ap-southeast-1}")
    private String studentFaceRekognitionRegion;

    @Value("${app.student-face.rekognition-threshold:90}")
    private Float studentFaceRekognitionThreshold;

    @Value("${app.student-face.max-size-bytes:5242880}")
    private long studentFaceMaxSizeBytes;

    public List<UserProfile> findAll() {
        return userProfileRepository.findAllByOrderByStudentIdAsc();
    }

    public Optional<UserProfile> findById(Long id) {
        return userProfileRepository.findById(id);
    }

    public Optional<UserProfile> findByStudentId(String studentId) {
        return userProfileRepository.findByStudentId(studentId);
    }

    public List<StudentGroup> findAllStudentGroups() {
        return studentGroupRepository.findAllByOrderByCodeAsc();
    }

    @Transactional
    public UserProfile save(UserProfile userProfile) {
        return save(userProfile, true);
    }

    @Transactional
    public UserProfile save(UserProfile userProfile, boolean sendMail) {
        Clazz targetClazz = resolveClazz(userProfile);
        requireClazzSelected(targetClazz);
        StudentGroup targetGroup = resolveStudentGroupForCreate(userProfile);
        ensureClassHasRoom(null, targetClazz, 1);
        userProfile.setStudentId(clean(userProfile.getStudentId()));
        userProfile.setFullName(clean(userProfile.getFullName()));
        userProfile.setContactPhone(clean(userProfile.getContactPhone()));
        userProfile.setEmail(resolveStudentEmail(userProfile.getStudentId(), userProfile.getEmail()));
        userProfile.setClazz(targetClazz);
        userProfile.setStudentGroup(targetGroup);
        UserProfile savedProfile = userProfileRepository.save(userProfile);
        createAuthAccount(savedProfile, sendMail);
        return savedProfile;
    }

    @Transactional
    public String bulkImport(List<StudentImportRow> rows) {
        return bulkImport(rows, true);
    }

    @Transactional
    public String bulkImport(List<StudentImportRow> rows, boolean sendMail) {
        return bulkImport(rows, null, sendMail);
    }

    @Transactional
    public String bulkImport(List<StudentImportRow> rows, Consumer<StudentImportProgress> progressConsumer) {
        return bulkImport(rows, progressConsumer, true);
    }

    @Transactional
    public String bulkImport(List<StudentImportRow> rows, Consumer<StudentImportProgress> progressConsumer, boolean sendMail) {
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
            Clazz clazz = resolveImportClass(row, organizationSummary, classCache);
            if (clazz == null) {
                skippedStudents++;
                reportIfNeeded(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents,
                        skippedStudents, authProcessed, 0, "Đang kiểm tra dữ liệu sinh viên.");
                continue;
            }
            StudentGroup studentGroup = resolveImportStudentGroup(row, studentGroupCache);
            Optional<UserProfile> existingProfile = Optional.ofNullable(existingProfiles.get(studentId));
            pendingAccounts.add(new BulkRegisterMessage.UserAccountDTO(
                    studentId,
                    resolveStudentEmail(studentId, row.getEmail(), existingProfile.orElse(null))
            ));

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
        String authMessage = sendMail
                ? "Đang tạo tài khoản đăng nhập và gửi email cho sinh viên mới."
                : "Đang tạo tài khoản đăng nhập, bỏ qua gửi email theo tùy chọn import.";
        report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                authProcessed, authTotal, authMessage);

        for (int start = 0; start < pendingAccounts.size(); start += AUTH_BATCH_SIZE) {
            int end = Math.min(start + AUTH_BATCH_SIZE, pendingAccounts.size());
            List<BulkRegisterMessage.UserAccountDTO> accountBatch = pendingAccounts.subList(start, end);
            runAuthSync("import tài khoản sinh viên", () ->
                    authServiceClient.bulkRegisterAccount(INTERNAL_ADMIN_ROLE, sendMail, accountBatch)
            );
            authProcessed = end;
            String progressMessage = sendMail
                    ? "Đang tạo tài khoản đăng nhập và gửi email: "
                    : "Đang tạo tài khoản đăng nhập không gửi email: ";
            report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                    authProcessed, authTotal, progressMessage + authProcessed + "/" + authTotal + ".");
        }

        String result = organizationSummary.toStudentMessage(createdStudents, updatedStudents, skippedStudents);
        if (!sendMail) {
            result += " Đã bỏ qua gửi email tài khoản theo tùy chọn import.";
        }
        report(progressConsumer, totalRows, processedRows, createdStudents, updatedStudents, skippedStudents,
                authProcessed, authTotal, result);
        return result;
    }

    @Transactional
    public UserProfile update(Long id, UserProfile userDetails) {
        return userProfileRepository.findById(id).map(user -> {
            String requestedStudentId = clean(userDetails.getStudentId());
            if (!requestedStudentId.isBlank() && !requestedStudentId.equalsIgnoreCase(clean(user.getStudentId()))) {
                throw new BadRequestException("MSSV không được thay đổi sau khi tạo hồ sơ.");
            }

            String previousEmail = normalizeEmail(user.getEmail());
            UserProfile.StudentStatus previousStatus = user.getStudentStatus();
            UserProfile.StudentStatus targetStatus = userDetails.getStudentStatus();
            Clazz targetClazz = resolveClazz(userDetails);
            requireClazzSelected(targetClazz);
            StudentGroup targetGroup = resolveStudentGroupForUpdate(user, userDetails);
            ensureClassHasRoom(user, targetClazz, 1);
            user.setFullName(clean(userDetails.getFullName()));
            user.setStudentId(user.getStudentId());
            String targetEmail = resolveStudentEmail(user.getStudentId(), userDetails.getEmail());
            user.setEmail(targetEmail);
            user.setDob(userDetails.getDob());
            user.setGender(userDetails.getGender());
            user.setContactPhone(clean(userDetails.getContactPhone()));
            user.setClazz(targetClazz);
            user.setStudentGroup(targetGroup);
            user.setStudentStatus(targetStatus);
            UserProfile savedUser = userProfileRepository.save(user);
            syncAuthEmailForStudent(savedUser.getStudentId(), previousEmail, savedUser.getEmail());
            syncAuthAccessForStudentStatus(savedUser.getStudentId(), previousStatus, targetStatus);
            return savedUser;
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
        Map<Long, UserProfile.StudentStatus> previousStatuses = students.stream()
                .collect(Collectors.toMap(UserProfile::getId, UserProfile::getStudentStatus));

        students.forEach(student -> student.setStudentStatus(status));
        List<UserProfile> savedStudents = userProfileRepository.saveAll(students);
        savedStudents.forEach(student -> syncAuthAccessForStudentStatus(
                student.getStudentId(),
                previousStatuses.get(student.getId()),
                status
        ));
        return new BulkStudentUpdateResponse(
                students.size(),
                "Đã cập nhật trạng thái cho " + students.size() + " sinh viên."
        );
    }

    @Transactional
    public BulkStudentUpdateResponse updateStudentGroups(BulkStudentGroupRequest request) {
        StudentGroup targetGroup = studentGroupRepository.findById(request.getStudentGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm sinh viên với id: " + request.getStudentGroupId()));
        List<UserProfile> students = loadStudentsForGroupScope(request);
        if (students.isEmpty()) {
            throw new BadRequestException("Không tìm thấy sinh viên phù hợp để chuyển nhóm.");
        }

        students.forEach(student -> student.setStudentGroup(targetGroup));
        userProfileRepository.saveAll(students);
        return new BulkStudentUpdateResponse(
                students.size(),
                "Đã chuyển " + students.size() + " sinh viên sang nhóm " + targetGroup.getName() + "."
        );
    }

    @Transactional
    public void delete(Long id) {
        UserProfile student = userProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên với id: " + id));

        syncDeleteAuthAccountsForStudents(List.of(student));
        userProfileRepository.delete(student);
    }

    @Transactional
    public BulkStudentUpdateResponse deleteAll(List<Long> studentIds) {
        List<UserProfile> students = loadStudentsByIds(studentIds);
        syncDeleteAuthAccountsForStudents(students);
        userProfileRepository.deleteAll(students);
        return new BulkStudentUpdateResponse(
                students.size(),
                "Đã xóa " + students.size() + " sinh viên và tài khoản đăng nhập tương ứng."
        );
    }

    @Transactional
    public UserProfile updateContactByStudentId(String studentId, String contactPhone) {
        UserProfile user = userProfileRepository.findByStudentId(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên với MSSV: " + studentId));

        user.setContactPhone(clean(contactPhone));
        return userProfileRepository.save(user);
    }

    @Transactional
    public UserProfile updateFaceImage(Long id, MultipartFile file) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kh?ng t?m th?y h? s? sinh vi?n v?i id: " + id));
        validateStudentFaceFile(file);

        String studentCode = clean(user.getStudentId()).isBlank() ? String.valueOf(id) : clean(user.getStudentId());
        String year = String.valueOf(Year.now().getValue());
        String extension = resolveImageExtension(file.getOriginalFilename(), file.getContentType());
        String fileName = studentCode + "-" + UUID.randomUUID().toString().replace("-", "") + extension;

        if (useS3FaceStorage()) {
            String key = buildS3FaceKey(year, fileName);
            uploadFaceImageToS3(file, key);
            user.setFaceImagePath("s3://" + studentFaceS3Bucket.trim() + "/" + key);
        } else {
            Path targetDirectory = Path.of(studentFaceUploadDir, year).normalize();
            Path targetFile = targetDirectory.resolve(fileName).normalize();
            if (!targetFile.startsWith(targetDirectory)) {
                throw new BadRequestException("T?n file ?nh khu?n m?t kh?ng h?p l?");
            }
            try {
                Files.createDirectories(targetDirectory);
                Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ex) {
                throw new BadRequestException("Kh?ng l?u ???c ?nh khu?n m?t, vui l?ng th? l?i");
            }
            user.setFaceImagePath(targetFile.toString());
        }

        user.setFaceImageUrl("/api/users/" + id + "/face-image");
        return userProfileRepository.save(user);
    }

    public StudentFaceImage loadFaceImage(Long id) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kh?ng t?m th?y h? s? sinh vi?n v?i id: " + id));
        if (user.getFaceImagePath() == null || user.getFaceImagePath().isBlank()) {
            throw new ResourceNotFoundException("Sinh vi?n ch?a c? ?nh khu?n m?t m?u");
        }

        if (user.getFaceImagePath().startsWith("s3://")) {
            return loadFaceImageFromS3(user.getFaceImagePath());
        }

        Path imagePath = Path.of(user.getFaceImagePath()).normalize();
        if (!Files.exists(imagePath) || !Files.isRegularFile(imagePath)) {
            throw new ResourceNotFoundException("Kh?ng t?m th?y file ?nh khu?n m?t m?u");
        }
        try {
            String contentType = Files.probeContentType(imagePath);
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }
            return new StudentFaceImage(Files.readAllBytes(imagePath), contentType, imagePath.getFileName().toString());
        } catch (IOException ex) {
            throw new BadRequestException("Kh?ng ??c ???c ?nh khu?n m?t m?u");
        }
    }

    public FaceVerificationResponse verifyFaceByStudentId(String studentId, MultipartFile file) {
        UserProfile user = userProfileRepository.findByStudentId(clean(studentId))
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay ho so sinh vien voi MSSV: " + studentId));
        validateStudentFaceFile(file);
        if (user.getFaceImagePath() == null || user.getFaceImagePath().isBlank()) {
            throw new BadRequestException("Sinh vien " + user.getStudentId() + " chua co anh khuon mat mau");
        }
        if (!user.getFaceImagePath().startsWith("s3://")) {
            throw new BadRequestException("Anh khuon mat mau can duoc luu tren S3 de xac thuc bang AWS Rekognition");
        }

        S3Location sourceLocation = parseS3StoredPath(user.getFaceImagePath());
        try (RekognitionClient rekognitionClient = createRekognitionClient()) {
            Image sourceImage = Image.builder()
                    .s3Object(S3Object.builder()
                            .bucket(sourceLocation.bucket())
                            .name(sourceLocation.key())
                            .build())
                    .build();
            Image targetImage = Image.builder()
                    .bytes(SdkBytes.fromInputStream(file.getInputStream()))
                    .build();
            CompareFacesRequest request = CompareFacesRequest.builder()
                    .sourceImage(sourceImage)
                    .targetImage(targetImage)
                    .similarityThreshold(studentFaceRekognitionThreshold)
                    .build();
            CompareFacesResponse response = rekognitionClient.compareFaces(request);
            Float similarity = response.faceMatches().stream()
                    .map(CompareFacesMatch::similarity)
                    .filter(value -> value != null)
                    .max(Float::compareTo)
                    .orElse(null);
            boolean verified = similarity != null && similarity >= studentFaceRekognitionThreshold;
            return FaceVerificationResponse.builder()
                    .verified(verified)
                    .similarity(similarity)
                    .threshold(studentFaceRekognitionThreshold)
                    .message(verified ? "Khuon mat khop voi anh mau" : "Khuon mat khong khop voi anh mau")
                    .build();
        } catch (IOException ex) {
            throw new BadRequestException("Khong doc duoc anh chup de xac thuc khuon mat");
        } catch (RekognitionException ex) {
            throw new BadRequestException("AWS Rekognition khong xac thuc duoc khuon mat: " + ex.awsErrorDetails().errorMessage());
        }
    }

    private boolean useS3FaceStorage() {
        return "s3".equalsIgnoreCase(studentFaceStorageProvider);
    }

    private String buildS3FaceKey(String year, String fileName) {
        String prefix = studentFaceS3Prefix == null ? "student-faces" : studentFaceS3Prefix.trim();
        if (prefix.startsWith("/")) {
            prefix = prefix.substring(1);
        }
        if (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        if (prefix.isBlank()) {
            prefix = "student-faces";
        }
        return prefix + "/" + year + "/" + fileName;
    }

    private void uploadFaceImageToS3(MultipartFile file, String key) {
        if (studentFaceS3Bucket == null || studentFaceS3Bucket.isBlank()) {
            throw new BadRequestException("Chua cau hinh S3 bucket de luu anh khuon mat sinh vien");
        }
        try (S3Client s3Client = createS3Client()) {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(studentFaceS3Bucket.trim())
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException ex) {
            throw new BadRequestException("Khong doc duoc anh khuon mat de upload S3");
        } catch (S3Exception ex) {
            throw new BadRequestException("Khong upload duoc anh khuon mat len S3: " + ex.awsErrorDetails().errorMessage());
        }
    }

    private StudentFaceImage loadFaceImageFromS3(String storedPath) {
        S3Location location = parseS3StoredPath(storedPath);
        try (S3Client s3Client = createS3Client()) {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(location.bucket())
                    .key(location.key())
                    .build();
            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(request);
            String contentType = objectBytes.response().contentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }
            String fileName = location.key().substring(location.key().lastIndexOf('/') + 1);
            return new StudentFaceImage(objectBytes.asByteArray(), contentType, fileName);
        } catch (S3Exception ex) {
            throw new ResourceNotFoundException("Khong tim thay anh khuon mat tren S3");
        }
    }

    private S3Location parseS3StoredPath(String storedPath) {
        if (storedPath == null || !storedPath.startsWith("s3://")) {
            throw new BadRequestException("Duong dan anh khuon mat S3 khong hop le");
        }
        String value = storedPath.substring("s3://".length());
        int slashIndex = value.indexOf('/');
        if (slashIndex <= 0 || slashIndex >= value.length() - 1) {
            throw new BadRequestException("Duong dan anh khuon mat S3 khong hop le");
        }
        return new S3Location(value.substring(0, slashIndex), value.substring(slashIndex + 1));
    }

    private S3Client createS3Client() {
        return S3Client.builder()
                .region(Region.of(studentFaceS3Region == null || studentFaceS3Region.isBlank() ? "ap-southeast-1" : studentFaceS3Region.trim()))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    private RekognitionClient createRekognitionClient() {
        return RekognitionClient.builder()
                .region(Region.of(studentFaceRekognitionRegion == null || studentFaceRekognitionRegion.isBlank() ? "ap-southeast-1" : studentFaceRekognitionRegion.trim()))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    private record S3Location(String bucket, String key) {
    }

    private void validateStudentFaceFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui l?ng ch?n ?nh khu?n m?t sinh vi?n");
        }
        if (file.getSize() > studentFaceMaxSizeBytes) {
            throw new BadRequestException("?nh khu?n m?t kh?ng ???c v??t qu? " + (studentFaceMaxSizeBytes / 1024 / 1024) + "MB");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp")) {
            throw new BadRequestException("?nh khu?n m?t ch? h? tr? JPG, PNG ho?c WEBP");
        }
    }

    private String resolveImageExtension(String originalFilename, String contentType) {
        String lowerName = originalFilename == null ? "" : originalFilename.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".png")) {
            return ".png";
        }
        if (lowerName.endsWith(".webp")) {
            return ".webp";
        }
        if (lowerName.endsWith(".jpeg")) {
            return ".jpeg";
        }
        if (lowerName.endsWith(".jpg")) {
            return ".jpg";
        }
        return contentType != null && contentType.toLowerCase(Locale.ROOT).contains("png") ? ".png" : ".jpg";
    }

    private void requireClazzSelected(Clazz clazz) {
        if (clazz == null) {
            throw new BadRequestException("Vui lòng chọn lớp hợp lệ.");
        }
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

    private void createAuthAccount(UserProfile profile, boolean sendMail) {
        runAuthSync("tạo tài khoản sinh viên", () ->
                authServiceClient.registerAccount(INTERNAL_ADMIN_ROLE, sendMail, new AuthServiceClient.RegisterRequest(
                        profile.getStudentId(),
                        resolveStudentEmail(profile.getStudentId(), profile.getEmail())
                ))
        );
    }

    private void syncAuthEmailForStudent(String studentId, String previousEmail, String currentEmail) {
        if (isBlank(studentId)) {
            return;
        }

        String normalizedCurrentEmail = normalizeEmail(currentEmail);
        if (Objects.equals(normalizeEmail(previousEmail), normalizedCurrentEmail)) {
            return;
        }

        runAuthSync("cập nhật email đăng nhập", () ->
                authServiceClient.updateEmail(
                        INTERNAL_ADMIN_ROLE,
                        clean(studentId),
                        new AuthServiceClient.UpdateEmailRequest(normalizedCurrentEmail)
                )
        );
    }

    private void syncDeleteAuthAccountsForStudents(List<UserProfile> students) {
        List<String> studentCodes = students.stream()
                .map(UserProfile::getStudentId)
                .map(this::clean)
                .filter(studentId -> !studentId.isBlank())
                .distinct()
                .toList();

        if (studentCodes.isEmpty()) {
            return;
        }

        if (studentCodes.size() == 1) {
            runAuthSync("xóa tài khoản đăng nhập", () ->
                    authServiceClient.deleteAccount(INTERNAL_ADMIN_ROLE, studentCodes.get(0))
            );
            return;
        }

        runAuthSync("xóa tài khoản đăng nhập hàng loạt", () ->
                authServiceClient.deleteAccounts(INTERNAL_ADMIN_ROLE, studentCodes)
        );
    }

    private void syncAuthAccessForStudentStatus(
            String studentId,
            UserProfile.StudentStatus previousStatus,
            UserProfile.StudentStatus targetStatus
    ) {
        if (isBlank(studentId) || targetStatus == null) {
            return;
        }

        if (targetStatus == UserProfile.StudentStatus.SUSPENDED) {
            runAuthSync("khóa tài khoản sinh viên bị đình chỉ", () ->
                    authServiceClient.revokeAccess(INTERNAL_ADMIN_ROLE, clean(studentId))
            );
            return;
        }

        if (previousStatus == UserProfile.StudentStatus.SUSPENDED) {
            runAuthSync("mở khóa tài khoản sinh viên", () ->
                    authServiceClient.unlockAccess(INTERNAL_ADMIN_ROLE, clean(studentId))
            );
        }
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

    private List<UserProfile> loadStudentsForGroupScope(BulkStudentGroupRequest request) {
        if (request.getScope() == BulkStudentGroupRequest.Scope.CLASS) {
            classRepository.findById(request.getClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp với id: " + request.getClassId()));
            return userProfileRepository.findByClazzIdOrderByStudentIdAsc(request.getClassId());
        }

        if (request.getScope() == BulkStudentGroupRequest.Scope.ACADEMIC_YEAR) {
            academicYearRepository.findById(request.getAcademicYearId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy niên khóa với id: " + request.getAcademicYearId()));
            return userProfileRepository.findByClazzAcademicYearIdOrderByStudentIdAsc(request.getAcademicYearId());
        }

        return loadStudentsByIds(request.getStudentIds());
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
        String rowEmail = normalizeEmail(row.getEmail());
        if (!rowEmail.isBlank() || isBlank(profile.getEmail())) {
            profile.setEmail(resolveStudentEmail(profile.getStudentId(), rowEmail));
        }

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

    private void runAuthSync(String actionLabel, Runnable action) {
        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= AUTH_SYNC_MAX_ATTEMPTS; attempt++) {
            try {
                action.run();
                return;
            } catch (RuntimeException ex) {
                lastException = ex;
                if (attempt >= AUTH_SYNC_MAX_ATTEMPTS || !shouldRetryAuthSync(ex)) {
                    break;
                }
                waitBeforeAuthRetry(attempt);
            }
        }

        throw new BadRequestException(authSyncErrorMessage(actionLabel, lastException));
    }

    private boolean shouldRetryAuthSync(RuntimeException ex) {
        if (ex instanceof FeignException feignException) {
            int status = feignException.status();
            return status == -1 || status >= 500;
        }
        return false;
    }

    private void waitBeforeAuthRetry(int attempt) {
        try {
            Thread.sleep(AUTH_SYNC_RETRY_DELAY_MS * attempt);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Không thể đồng bộ tài khoản đăng nhập vì tiến trình bị gián đoạn.");
        }
    }

    private String authSyncErrorMessage(String actionLabel, RuntimeException ex) {
        String baseMessage = "Không đồng bộ được tài khoản đăng nhập khi " + actionLabel + ". Vui lòng thử lại.";
        if (ex instanceof FeignException feignException) {
            int status = feignException.status();
            if (status == 403) {
                return "Auth-service từ chối thao tác " + actionLabel + ". Vui lòng kiểm tra quyền gọi nội bộ.";
            }
            if (status == 404) {
                return "Không tìm thấy tài khoản đăng nhập khi " + actionLabel + ". Vui lòng kiểm tra lại MSSV.";
            }
            if (status >= 400 && status < 500) {
                return "Dữ liệu tài khoản đăng nhập không hợp lệ khi " + actionLabel + ". Vui lòng kiểm tra lại thông tin.";
            }
        }
        return baseMessage;
    }

    private String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String resolveStudentEmail(String studentId, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail.isBlank()) {
            return normalizedEmail;
        }
        return defaultStudentEmail(studentId);
    }

    private String resolveStudentEmail(String studentId, String email, UserProfile existingProfile) {
        String normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail.isBlank()) {
            return normalizedEmail;
        }
        if (existingProfile != null && !isBlank(existingProfile.getEmail())) {
            return normalizeEmail(existingProfile.getEmail());
        }
        return defaultStudentEmail(studentId);
    }

    private String normalizeEmail(String email) {
        return clean(email).toLowerCase(Locale.ROOT);
    }

    private String defaultStudentEmail(String studentId) {
        String domain = studentEmailDomain == null || studentEmailDomain.isBlank()
                ? "student.edu.vn"
                : studentEmailDomain.trim().replaceFirst("^@", "");
        return clean(studentId).toLowerCase(Locale.ROOT) + "@" + domain.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ImportCounters(int createdStudents, int updatedStudents) {
    }
}
