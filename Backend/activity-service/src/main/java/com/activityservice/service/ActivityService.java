package com.activityservice.service;

import com.activityservice.client.UserClient;
import com.activityservice.domain.Activity;
import com.activityservice.domain.ActivityChecker;
import com.activityservice.domain.ActivityRegistration;
import com.activityservice.dto.ActivityRequest;
import com.activityservice.dto.ActivityResponse;
import com.activityservice.dto.CheckerRequest;
import com.activityservice.dto.CheckerResponse;
import com.activityservice.dto.CheckinRequest;
import com.activityservice.dto.FaceVerificationAdjustmentRequest;
import com.activityservice.dto.FaceCheckinBatchResponse;
import com.activityservice.dto.FaceVerificationResponse;
import com.activityservice.dto.QrCheckinRequest;
import com.activityservice.dto.QrSessionRequest;
import com.activityservice.dto.QrSessionResponse;
import com.activityservice.dto.RegistrationResponse;
import com.activityservice.dto.UserProfileDTO;
import com.activityservice.exception.BadRequestException;
import com.activityservice.exception.ForbiddenException;
import com.activityservice.exception.ResourceNotFoundException;
import com.activityservice.repository.ActivityCheckerRepository;
import com.activityservice.repository.ActivityRegistrationRepository;
import com.activityservice.repository.ActivityRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private static final String INTERNAL_ROLE = "SYSTEM";
    private static final String INTERNAL_USER_CODE = "activity-service";
    private static final int DEFAULT_QR_LOCATION_RADIUS_METERS = 100;
    private static final int MAX_QR_LOCATION_RADIUS_METERS = 1000;
    private static final double EARTH_RADIUS_METERS = 6_371_000D;

    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final ActivityCheckerRepository checkerRepository;
    private final UserClient userClient;

    @Transactional(readOnly = true)
    public List<ActivityResponse> findAll(String currentUserCode) {
        return activityRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(activity -> toResponse(activity, currentUserCode))
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityResponse findById(Long id, String currentUserCode) {
        return toResponse(getActivity(id), currentUserCode);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> findOngoingForChecker(String checkerCodeOrTsid) {
        if (checkerCodeOrTsid == null || checkerCodeOrTsid.isBlank()) {
            return List.of();
        }

        return checkerRepository.findByCheckerCodeOrTsid(checkerCodeOrTsid.trim())
                .stream()
                .map(ActivityChecker::getActivity)
                .filter(activity -> activity.getStatus() == Activity.Status.ONGOING)
                .sorted(Comparator.comparing(Activity::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ActivityResponse create(ActivityRequest request, String createdBy) {
        validateTimeWindow(request.getStartTime(), request.getEndTime());
        validateRegistrationWindow(request);

        Activity activity = new Activity();
        applyRequest(activity, request);
        activity.setCreatedBy(createdBy);
        activity.setStatus(Activity.Status.UPCOMING);
        return toResponse(activityRepository.save(activity));
    }

    @Transactional
    public ActivityResponse update(Long id, ActivityRequest request) {
        validateTimeWindow(request.getStartTime(), request.getEndTime());
        validateRegistrationWindow(request);

        Activity activity = getActivity(id);
        long registrationCount = registrationRepository.countByActivityId(id);
        if (registrationCount > 0 && getParticipationType(activity) != resolveParticipationType(request.getParticipationType())) {
            throw new BadRequestException("Hoạt động đã có sinh viên đăng ký nên không được đổi hình thức tham gia");
        }
        if (request.getCapacity() != null && request.getCapacity() < registrationCount) {
            throw new BadRequestException("Số lượng tối đa không được nhỏ hơn số sinh viên đã đăng ký");
        }
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Chỉ được chỉnh sửa hoạt động ở trạng thái Sắp diễn ra");
        }

        applyRequest(activity, request);
        return toResponse(activityRepository.save(activity));
    }

    @Transactional
    public ActivityResponse updateStatus(Long id, Activity.Status nextStatus) {
        Activity activity = getActivity(id);
        Activity.Status currentStatus = activity.getStatus();

        if (currentStatus == Activity.Status.COMPLETED) {
            throw new BadRequestException("Hoạt động đã hoàn tất nên không được chuyển trạng thái");
        }
        if (currentStatus == Activity.Status.UPCOMING && nextStatus == Activity.Status.COMPLETED) {
            throw new BadRequestException("Hoạt động phải chuyển sang Đang diễn ra trước khi Hoàn tất");
        }
        if (currentStatus == Activity.Status.ONGOING && nextStatus == Activity.Status.UPCOMING) {
            throw new BadRequestException("Không được chuyển ngược hoạt động từ Đang diễn ra về Sắp diễn ra");
        }

        activity.setStatus(nextStatus);
        return toResponse(activityRepository.save(activity));
    }

    @Transactional
    public void delete(Long id) {
        Activity activity = getActivity(id);
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Chỉ được xóa hoạt động ở trạng thái Sắp diễn ra");
        }
        activityRepository.delete(activity);
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> getRegistrations(Long activityId) {
        getActivity(activityId);
        return registrationRepository.findByActivityIdOrderByStudentCodeAsc(activityId)
                .stream()
                .map(this::toRegistrationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> getMyRegistrations(String studentCode) {
        if (studentCode == null || studentCode.isBlank()) {
            throw new BadRequestException("Không xác định được sinh viên đang đăng nhập");
        }
        return registrationRepository.findHistoryByStudentCode(studentCode.trim())
                .stream()
                .map(this::toRegistrationResponse)
                .toList();
    }

    @Transactional
    public RegistrationResponse registerMe(Long activityId, String studentCode) {
        if (studentCode == null || studentCode.isBlank()) {
            throw new BadRequestException("Không xác định được mã sinh viên đang đăng nhập");
        }

        Activity activity = activityRepository.findByIdForUpdate(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hoạt động"));
        requireLimitedActivity(activity);
        validateSelfRegistrationAllowed(activity);

        String cleanStudentCode = studentCode.trim();
        UserProfileDTO studentProfile = requireExistingStudent(cleanStudentCode, "sinh viên");
        String userTsid = resolveUserTsid(studentProfile);

        if (registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(activityId, cleanStudentCode)
                || registrationRepository.existsByActivityIdAndUserTsidIgnoreCase(activityId, userTsid)) {
            throw new BadRequestException("Bạn đã đăng ký hoạt động này");
        }

        long registrationCount = registrationRepository.countByActivityId(activityId);
        if (activity.getCapacity() != null && registrationCount >= activity.getCapacity()) {
            throw new BadRequestException("Hoạt động đã đủ số lượng đăng ký");
        }

        ActivityRegistration registration = new ActivityRegistration();
        registration.setActivity(activity);
        registration.setStudentCode(studentProfile.getStudentId().trim());
        registration.setFullName(studentProfile.getFullName().trim());
        registration.setClassCode(resolveClassCode(studentProfile));
        registration.setUserTsid(userTsid);

        try {
            return toRegistrationResponse(registrationRepository.save(registration));
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Bạn đã đăng ký hoạt động này");
        }
    }

    @Transactional
    public CheckerResponse addChecker(Long activityId, CheckerRequest request) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() == Activity.Status.COMPLETED) {
            throw new BadRequestException("Không được thêm người điểm danh cho hoạt động đã hoàn tất");
        }

        String checkerCode = request.getCheckerCode().trim();
        String checkerName = request.getCheckerName().trim();
        String checkerTsid = request.getCheckerTsid() == null || request.getCheckerTsid().isBlank()
                ? checkerCode
                : request.getCheckerTsid().trim();
        UserProfileDTO checkerProfile = requireMatchingStudent(checkerCode, checkerName, "người điểm danh");

        if (checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCase(activityId, checkerTsid)
                || checkerRepository.existsByActivityIdAndCheckerCodeIgnoreCase(activityId, checkerCode)) {
            throw new BadRequestException("Người điểm danh đã được phân quyền cho hoạt động này");
        }

        ActivityChecker checker = new ActivityChecker();
        checker.setActivity(activity);
        checker.setCheckerTsid(checkerTsid);
        checker.setCheckerCode(checkerProfile.getStudentId().trim());
        checker.setCheckerName(checkerProfile.getFullName().trim());
        return toCheckerResponse(checkerRepository.save(checker));
    }

    public List<CheckerResponse> getCheckers(Long activityId) {
        getActivity(activityId);
        return checkerRepository.findByActivityIdOrderByCheckerCodeAsc(activityId)
                .stream()
                .map(this::toCheckerResponse)
                .toList();
    }

    @Transactional
    public void removeChecker(Long activityId, Long checkerId) {
        ActivityChecker checker = checkerRepository.findById(checkerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người điểm danh"));
        if (!checker.getActivity().getId().equals(activityId)) {
            throw new BadRequestException("Người điểm danh không thuộc hoạt động này");
        }
        checkerRepository.delete(checker);
    }

    @Transactional
    public RegistrationResponse checkin(Long activityId, String checkerCodeOrTsid, CheckinRequest request) {
        throw new BadRequestException("Nghiệp vụ điểm danh đầu giờ hiện sử dụng xác thực khuôn mặt. Vui lòng dùng chức năng xác thực khuôn mặt của người điểm danh.");
    }

    @Transactional
    public QrSessionResponse createQrSession(Long activityId, QrSessionRequest request) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Chỉ tạo QR khi hoạt động đang diễn ra");
        }
        Activity.AttendanceSession session = request.getSession();
        requireQrSessionAllowed(activity, session);

        int minutes = request.getExpiresInMinutes() == null ? 10 : request.getExpiresInMinutes();
        if (minutes < 1 || minutes > 240) {
            throw new BadRequestException("Thời gian tồn tại QR phải từ 1 đến 240 phút");
        }
        validateQrSessionLocationRequest(request);

        String qrCode = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(minutes);
        if (session == Activity.AttendanceSession.MIDDLE) {
            activity.setMiddleQrCode(qrCode);
            activity.setMiddleQrExpiresAt(expiresAt);
            applyQrSessionLocation(activity, session, request);
        } else {
            activity.setFinalQrCode(qrCode);
            activity.setFinalQrExpiresAt(expiresAt);
            applyQrSessionLocation(activity, session, request);
        }
        activityRepository.save(activity);
        return toQrSessionResponse(activity, session, qrCode, expiresAt);
    }

    @Transactional
    public FaceCheckinBatchResponse faceCheckin(Long activityId, String currentUserRole, String currentUserCode, MultipartFile faceImage) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Chỉ được xác thực khuôn mặt khi hoạt động đang diễn ra");
        }
        if (!isAdminOrSystem(currentUserRole) && !isCheckerForActivity(activityId, currentUserCode)) {
            throw new ForbiddenException("Tài khoản hiện tại chưa được phân quyền xác thực khuôn mặt cho hoạt động này");
        }

        String candidateStudentCodes = resolveFaceIdentificationCandidates(activity);
        List<FaceVerificationResponse> verifications;
        try {
            verifications = userClient.identifyStudentFaces(INTERNAL_ROLE, INTERNAL_USER_CODE, candidateStudentCodes, faceImage);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Không tìm thấy ảnh khuôn mặt mẫu để xác thực");
        } catch (FeignException ex) {
            throw new BadRequestException("Không nhận diện được khuôn mặt sinh viên, vui lòng thử lại");
        }
        if (verifications == null || verifications.isEmpty()) {
            throw new BadRequestException("Không nhận diện được khuôn mặt sinh viên trong hoạt động này");
        }

        List<RegistrationResponse> checkedIn = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        for (FaceVerificationResponse verification : verifications) {
            if (verification == null || !verification.isVerified()
                    || verification.getStudentId() == null || verification.getStudentId().isBlank()) {
                continue;
            }
            String studentCode = verification.getStudentId().trim();
            try {
                UserProfileDTO studentProfile = findStudentProfile(studentCode, verification);
                ActivityRegistration registration = resolveFaceCheckinRegistration(activity, studentProfile);
                if (registration.isFaceVerified()) {
                    skipped.add(studentCode + ": đã điểm danh khuôn mặt trước đó");
                    continue;
                }
                syncRegistrationIdentity(registration, studentProfile);
                LocalDateTime now = LocalDateTime.now();
                registration.setFaceVerified(true);
                registration.setFaceVerifiedTime(now);
                if (registration.getCheckinTime() == null) {
                    registration.setCheckinTime(now);
                }
                registration.setFaceVerifiedBy(currentUserCode);
                registration.setFaceVerificationNote("Xác thực khuôn mặt đầu vào");
                refreshAttendanceResult(activity, registration, now);
                checkedIn.add(toRegistrationResponse(registrationRepository.save(registration)));
            } catch (BadRequestException | ResourceNotFoundException ex) {
                skipped.add(studentCode + ": " + ex.getMessage());
            }
        }

        return FaceCheckinBatchResponse.builder()
                .recognizedCount(verifications.size())
                .checkedInCount(checkedIn.size())
                .skippedCount(skipped.size())
                .registrations(checkedIn)
                .skipped(skipped)
                .build();
    }

    @Transactional
    public RegistrationResponse adjustFaceVerification(Long activityId, Long registrationId, String adminCode, FaceVerificationAdjustmentRequest request) {
        ActivityRegistration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sinh viên trong danh sách đăng ký"));
        if (!registration.getActivity().getId().equals(activityId)) {
            throw new BadRequestException("Sinh viên đăng ký không thuộc hoạt động này");
        }

        LocalDateTime now = LocalDateTime.now();
        boolean verified = Boolean.TRUE.equals(request.getFaceVerified());
        registration.setFaceVerified(verified);
        registration.setFaceVerifiedTime(verified ? (registration.getFaceVerifiedTime() == null ? now : registration.getFaceVerifiedTime()) : null);
        registration.setFaceVerifiedBy(adminCode);
        registration.setFaceVerificationNote(cleanOptional(request.getNote()));
        refreshAttendanceResult(registration.getActivity(), registration, now);
        return toRegistrationResponse(registrationRepository.save(registration));
    }

    @Transactional
    public RegistrationResponse qrCheckin(String studentCode, QrCheckinRequest request) {
        Activity activity = resolveQrActivity(request.getQrCode());
        return qrCheckin(activity.getId(), studentCode, request);
    }

    @Transactional
    public RegistrationResponse qrCheckin(Long activityId, String studentCode, QrCheckinRequest request) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Chỉ được quét QR khi hoạt động đang diễn ra");
        }
        if (getParticipationType(activity) == Activity.ParticipationType.OPEN) {
            throw new BadRequestException("Hoạt động tự do chỉ điểm danh bằng xác thực khuôn mặt");
        }
        if (studentCode == null || studentCode.isBlank()) {
            throw new BadRequestException("Không xác định được sinh viên đang đăng nhập");
        }

        Activity.AttendanceSession session = resolveQrSession(activity, request.getQrCode());
        ActivityRegistration registration = registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activityId, studentCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("MSSV không nằm trong danh sách đăng ký hợp lệ"));

        LocalDateTime now = LocalDateTime.now();
        if (session == Activity.AttendanceSession.MIDDLE) {
            if (registration.isMiddleAttended()) {
                throw new BadRequestException("Sinh viên đã điểm danh QR giữa giờ cho hoạt động này");
            }
            validateAndStoreQrCheckinLocation(activity, registration, session, request);
            registration.setMiddleAttended(true);
            registration.setMiddleCheckinTime(now);
        } else {
            if (registration.isFinalAttended()) {
                throw new BadRequestException("Sinh viên đã điểm danh QR cuối giờ cho hoạt động này");
            }
            validateAndStoreQrCheckinLocation(activity, registration, session, request);
            registration.setFinalAttended(true);
            registration.setFinalCheckinTime(now);
        }
        refreshAttendanceResult(activity, registration, now);
        return toRegistrationResponse(registrationRepository.save(registration));
    }

    private Activity getActivity(Long id) {
        return activityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hoạt động"));
    }

    private void applyRequest(Activity activity, ActivityRequest request) {
        activity.setTitle(request.getTitle());
        activity.setCategory(request.getCategory());
        activity.setReward(request.getReward());
        Activity.ParticipationType participationType = resolveParticipationType(request.getParticipationType());
        activity.setParticipationType(participationType);
        activity.setAttendanceSessionCount(resolveAttendanceSessionCount(request.getAttendanceSessionCount(), participationType));
        if (participationType == Activity.ParticipationType.OPEN) {
            activity.setGoogleFormUrl("");
            activity.setCapacity(null);
            activity.setRegistrationStartTime(null);
            activity.setRegistrationEndTime(null);
        } else {
            activity.setGoogleFormUrl(request.getGoogleFormUrl() == null ? "" : request.getGoogleFormUrl().trim());
            activity.setCapacity(request.getCapacity());
            activity.setRegistrationStartTime(request.getRegistrationStartTime());
            activity.setRegistrationEndTime(request.getRegistrationEndTime());
        }
        activity.setLocation(request.getLocation());
        activity.setStartTime(request.getStartTime());
        activity.setEndTime(request.getEndTime());
    }

    private String resolveFaceIdentificationCandidates(Activity activity) {
        if (getParticipationType(activity) != Activity.ParticipationType.LIMITED) {
            return "";
        }

        List<ActivityRegistration> registrations = registrationRepository.findByActivityIdOrderByStudentCodeAsc(activity.getId());
        if (registrations.isEmpty()) {
            throw new BadRequestException("Hoạt động chưa có sinh viên đăng ký để xác thực khuôn mặt");
        }

        List<String> registeredStudentCodes = registrations.stream()
                .filter(registration -> !registration.isFaceVerified())
                .map(ActivityRegistration::getStudentCode)
                .filter(studentCode -> studentCode != null && !studentCode.isBlank())
                .map(String::trim)
                .toList();
        if (registeredStudentCodes.isEmpty()) {
            throw new BadRequestException("Tất cả sinh viên đăng ký đã được xác thực khuôn mặt");
        }
        return String.join(",", registeredStudentCodes);
    }

    private ActivityRegistration resolveFaceCheckinRegistration(Activity activity, UserProfileDTO studentProfile) {
        String studentCode = studentProfile.getStudentId().trim();
        if (getParticipationType(activity) == Activity.ParticipationType.LIMITED) {
            return resolveCheckinRegistration(activity, studentCode);
        }

        return registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activity.getId(), studentCode)
                .orElseGet(() -> createOpenActivityRegistration(activity, studentProfile));
    }

    private ActivityRegistration resolveCheckinRegistration(Activity activity, String studentCode) {
        Long activityId = activity.getId();
        String cleanStudentCode = studentCode.trim();
        return registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activityId, cleanStudentCode)
                .orElseThrow(() -> new ResourceNotFoundException("MSSV không nằm trong danh sách đăng ký hợp lệ"));
    }

    private ActivityRegistration createOpenActivityRegistration(Activity activity, UserProfileDTO studentProfile) {
        ActivityRegistration registration = new ActivityRegistration();
        registration.setActivity(activity);
        registration.setStudentCode(studentProfile.getStudentId().trim());
        registration.setFullName(studentProfile.getFullName().trim());
        registration.setClassCode(resolveClassCode(studentProfile));
        registration.setUserTsid(resolveUserTsid(studentProfile));
        try {
            return registrationRepository.save(registration);
        } catch (DataIntegrityViolationException ex) {
            return registrationRepository
                    .findByActivityIdAndStudentCodeIgnoreCase(activity.getId(), studentProfile.getStudentId().trim())
                    .orElseThrow(() -> ex);
        }
    }

    private void syncRegistrationIdentity(ActivityRegistration registration, UserProfileDTO studentProfile) {
        String studentCode = studentProfile.getStudentId().trim();
        String userTsid = resolveUserTsid(studentProfile);

        if (registration.getStudentCode() == null || !registration.getStudentCode().equalsIgnoreCase(studentCode)) {
            registration.setStudentCode(studentCode);
        }
        if (registration.getUserTsid() == null || !registration.getUserTsid().equalsIgnoreCase(userTsid)) {
            registration.setUserTsid(userTsid);
        }
        if ((registration.getFullName() == null || registration.getFullName().isBlank())
                && studentProfile.getFullName() != null && !studentProfile.getFullName().isBlank()) {
            registration.setFullName(studentProfile.getFullName().trim());
        }
        String classCode = resolveClassCode(studentProfile);
        if (classCode != null && !classCode.isBlank()
                && (registration.getClassCode() == null || registration.getClassCode().isBlank())) {
            registration.setClassCode(classCode);
        }
    }

    private UserProfileDTO findStudentProfile(String studentCode, FaceVerificationResponse verification) {
        try {
            UserProfileDTO profile = requireExistingStudent(studentCode, "sinh viên");
            if ((profile.getId() == null) && verification.getUserId() != null) {
                profile.setId(verification.getUserId());
            }
            if ((profile.getFullName() == null || profile.getFullName().isBlank())
                    && verification.getFullName() != null && !verification.getFullName().isBlank()) {
                profile.setFullName(verification.getFullName().trim());
            }
            return profile;
        } catch (BadRequestException | ResourceNotFoundException ex) {
            UserProfileDTO profile = new UserProfileDTO();
            profile.setId(verification.getUserId());
            profile.setStudentId(studentCode);
            profile.setFullName(verification.getFullName() == null || verification.getFullName().isBlank()
                    ? studentCode
                    : verification.getFullName().trim());
            return profile;
        }
    }

    private String resolveClassCode(UserProfileDTO studentProfile) {
        if (studentProfile == null || studentProfile.getClazz() == null
                || studentProfile.getClazz().getClassCode() == null) {
            return null;
        }
        String classCode = studentProfile.getClazz().getClassCode().trim();
        return classCode.isBlank() ? null : classCode;
    }

    private String resolveUserTsid(UserProfileDTO studentProfile) {
        if (studentProfile.getId() != null) {
            return String.valueOf(studentProfile.getId());
        }
        return studentProfile.getStudentId().trim();
    }

    private void requireLimitedActivity(Activity activity) {
        if (getParticipationType(activity) == Activity.ParticipationType.OPEN) {
            throw new BadRequestException("Hoạt động tự do không cần danh sách đăng ký");
        }
    }

    private Activity.ParticipationType getParticipationType(Activity activity) {
        return activity.getParticipationType() == null ? Activity.ParticipationType.LIMITED : activity.getParticipationType();
    }

    private Activity.ParticipationType resolveParticipationType(Activity.ParticipationType participationType) {
        return participationType == null ? Activity.ParticipationType.LIMITED : participationType;
    }

    private int getAttendanceSessionCount(Activity activity) {
        Activity.ParticipationType participationType = getParticipationType(activity);
        Integer count = activity.getAttendanceSessionCount();
        if (participationType == Activity.ParticipationType.OPEN) {
            return 1;
        }
        return count != null && (count == 2 || count == 3) ? count : 2;
    }

    private int resolveAttendanceSessionCount(Integer count, Activity.ParticipationType participationType) {
        if (participationType == Activity.ParticipationType.OPEN) {
            return 1;
        }
        if (count == null) {
            return 2;
        }
        if (count != 2 && count != 3) {
            throw new BadRequestException("Hoạt động giới hạn chỉ được chọn 2 hoặc 3 lần điểm danh");
        }
        return count;
    }

    private void validateTimeWindow(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null) {
            throw new BadRequestException("Thời gian bắt đầu không được để trống");
        }
        if (endTime == null) {
            throw new BadRequestException("Thời gian kết thúc không được để trống");
        }
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private void validateRegistrationWindow(ActivityRequest request) {
        if (resolveParticipationType(request.getParticipationType()) != Activity.ParticipationType.LIMITED) {
            return;
        }

        LocalDateTime registrationStartTime = request.getRegistrationStartTime();
        LocalDateTime registrationEndTime = request.getRegistrationEndTime();
        if (registrationStartTime == null) {
            throw new BadRequestException("Thời gian mở đăng ký không được để trống");
        }
        if (registrationEndTime == null) {
            throw new BadRequestException("Thời gian đóng đăng ký không được để trống");
        }
        if (!registrationEndTime.isAfter(registrationStartTime)) {
            throw new BadRequestException("Thời gian đóng đăng ký phải sau thời gian mở đăng ký");
        }
        if (request.getStartTime() != null && registrationEndTime.isAfter(request.getStartTime())) {
            throw new BadRequestException("Thời gian đóng đăng ký không được sau thời gian bắt đầu hoạt động");
        }
    }

    private void validateSelfRegistrationAllowed(Activity activity) {
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Hoạt động hiện không mở đăng ký");
        }

        LocalDateTime now = LocalDateTime.now();
        if (activity.getRegistrationStartTime() == null || activity.getRegistrationEndTime() == null) {
            throw new BadRequestException("Hoạt động chưa được cấu hình thời gian đăng ký");
        }
        if (now.isBefore(activity.getRegistrationStartTime())) {
            throw new BadRequestException("Hoạt động chưa đến thời gian mở đăng ký");
        }
        if (now.isAfter(activity.getRegistrationEndTime())) {
            throw new BadRequestException("Hoạt động đã hết thời gian đăng ký");
        }
    }

    private UserProfileDTO requireMatchingStudent(String studentCode, String fullName, String subjectLabel) {
        UserProfileDTO profile;
        try {
            profile = userClient.getStudentProfile(INTERNAL_ROLE, INTERNAL_USER_CODE, studentCode);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Không tìm thấy " + subjectLabel + " có mã " + studentCode + " trong hệ thống");
        } catch (FeignException ex) {
            throw new BadRequestException("Chưa kiểm tra được thông tin " + subjectLabel + " " + studentCode + ", vui lòng thử lại");
        }

        if (profile == null || profile.getStudentId() == null || profile.getFullName() == null) {
            throw new BadRequestException("Hồ sơ " + subjectLabel + " " + studentCode + " chưa đầy đủ thông tin");
        }
        if (!normalizeText(profile.getStudentId()).equals(normalizeText(studentCode))) {
            throw new BadRequestException("Mã " + subjectLabel + " không khớp với hồ sơ");
        }
        if (!normalizeText(profile.getFullName()).equals(normalizeText(fullName))) {
            throw new BadRequestException("Họ tên không khớp với MSSV " + studentCode + ". Họ tên trong hồ sơ: " + profile.getFullName());
        }
        return profile;
    }

    private UserProfileDTO requireExistingStudent(String studentCode, String subjectLabel) {
        UserProfileDTO profile;
        try {
            profile = userClient.getStudentProfile(INTERNAL_ROLE, INTERNAL_USER_CODE, studentCode);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Không tìm thấy " + subjectLabel + " có mã " + studentCode + " trong hệ thống");
        } catch (FeignException ex) {
            throw new BadRequestException("Chưa kiểm tra được thông tin " + subjectLabel + " " + studentCode + ", vui lòng thử lại");
        }

        if (profile == null || profile.getStudentId() == null || profile.getFullName() == null) {
            throw new BadRequestException("Hồ sơ " + subjectLabel + " " + studentCode + " chưa đầy đủ thông tin");
        }
        if (!normalizeText(profile.getStudentId()).equals(normalizeText(studentCode))) {
            throw new BadRequestException("Mã " + subjectLabel + " không khớp với hồ sơ");
        }
        return profile;
    }

    private void requireQrSessionAllowed(Activity activity, Activity.AttendanceSession session) {
        if (getParticipationType(activity) == Activity.ParticipationType.OPEN) {
            throw new BadRequestException("Hoạt động tự do không sử dụng QR điểm danh");
        }
        if (session == null || session == Activity.AttendanceSession.FACE) {
            throw new BadRequestException("Chỉ được tạo QR cho mốc giữa giờ hoặc cuối giờ");
        }
        if (session == Activity.AttendanceSession.MIDDLE && getAttendanceSessionCount(activity) != 3) {
            throw new BadRequestException("Hoạt động này không cấu hình điểm danh giữa giờ");
        }
    }

    private void validateQrSessionLocationRequest(QrSessionRequest request) {
        Integer radius = request.getAllowedRadiusMeters() == null
                ? DEFAULT_QR_LOCATION_RADIUS_METERS
                : request.getAllowedRadiusMeters();
        if (radius < 10 || radius > MAX_QR_LOCATION_RADIUS_METERS) {
            throw new BadRequestException("Bán kính điểm danh phải từ 10 đến 1000 mét");
        }

        if (!Boolean.TRUE.equals(request.getLocationRequired())) {
            return;
        }

        validateLocationCoordinates(
                request.getLatitude(),
                request.getLongitude(),
                "Không lấy được vị trí máy admin để tạo QR có kiểm tra vị trí"
        );
        validateLocationAccuracy(request.getAccuracyMeters());
    }

    private void applyQrSessionLocation(Activity activity, Activity.AttendanceSession session, QrSessionRequest request) {
        boolean locationRequired = Boolean.TRUE.equals(request.getLocationRequired());
        Integer radius = request.getAllowedRadiusMeters() == null
                ? DEFAULT_QR_LOCATION_RADIUS_METERS
                : request.getAllowedRadiusMeters();

        if (session == Activity.AttendanceSession.MIDDLE) {
            activity.setMiddleQrLocationRequired(locationRequired);
            activity.setMiddleQrLatitude(locationRequired ? request.getLatitude() : null);
            activity.setMiddleQrLongitude(locationRequired ? request.getLongitude() : null);
            activity.setMiddleQrLocationAccuracyMeters(locationRequired ? request.getAccuracyMeters() : null);
            activity.setMiddleQrAllowedRadiusMeters(locationRequired ? radius : null);
            return;
        }

        activity.setFinalQrLocationRequired(locationRequired);
        activity.setFinalQrLatitude(locationRequired ? request.getLatitude() : null);
        activity.setFinalQrLongitude(locationRequired ? request.getLongitude() : null);
        activity.setFinalQrLocationAccuracyMeters(locationRequired ? request.getAccuracyMeters() : null);
        activity.setFinalQrAllowedRadiusMeters(locationRequired ? radius : null);
    }

    private void validateAndStoreQrCheckinLocation(
            Activity activity,
            ActivityRegistration registration,
            Activity.AttendanceSession session,
            QrCheckinRequest request
    ) {
        // Location-based QR anti-cheat is temporarily disabled while the app is not hosted.
        // Keep the schema and DTO fields intact so this can be re-enabled without a data change.
        if (isQrLocationValidationPaused()) {
            return;
        }

        if (!isQrLocationRequired(activity, session)) {
            return;
        }

        validateLocationCoordinates(
                getQrLatitude(activity, session),
                getQrLongitude(activity, session),
                "Phiên QR này chưa có vị trí gốc của admin, vui lòng yêu cầu phòng CTSV tạo lại mã QR"
        );
        validateLocationCoordinates(
                request.getLatitude(),
                request.getLongitude(),
                "Không lấy được vị trí hiện tại. Vui lòng cho phép trình duyệt truy cập vị trí rồi quét lại QR"
        );
        validateLocationAccuracy(request.getAccuracyMeters());

        double distanceMeters = calculateDistanceMeters(
                getQrLatitude(activity, session),
                getQrLongitude(activity, session),
                request.getLatitude(),
                request.getLongitude()
        );
        int allowedRadiusMeters = getQrAllowedRadiusMeters(activity, session);
        if (distanceMeters > allowedRadiusMeters) {
            throw new BadRequestException(String.format(
                    Locale.ROOT,
                    "Bạn đang ở ngoài phạm vi điểm danh (%.0f m, giới hạn %d m). Vui lòng đứng gần khu vực hoạt động để quét QR.",
                    distanceMeters,
                    allowedRadiusMeters
            ));
        }

        if (session == Activity.AttendanceSession.MIDDLE) {
            registration.setMiddleLocationVerified(true);
            registration.setMiddleLatitude(request.getLatitude());
            registration.setMiddleLongitude(request.getLongitude());
            registration.setMiddleLocationAccuracyMeters(request.getAccuracyMeters());
            registration.setMiddleDistanceMeters(distanceMeters);
            return;
        }

        registration.setFinalLocationVerified(true);
        registration.setFinalLatitude(request.getLatitude());
        registration.setFinalLongitude(request.getLongitude());
        registration.setFinalLocationAccuracyMeters(request.getAccuracyMeters());
        registration.setFinalDistanceMeters(distanceMeters);
    }

    private boolean isQrLocationValidationPaused() {
        return true;
    }

    private boolean isQrLocationRequired(Activity activity, Activity.AttendanceSession session) {
        return session == Activity.AttendanceSession.MIDDLE
                ? activity.isMiddleQrLocationRequired()
                : activity.isFinalQrLocationRequired();
    }

    private Double getQrLatitude(Activity activity, Activity.AttendanceSession session) {
        return session == Activity.AttendanceSession.MIDDLE
                ? activity.getMiddleQrLatitude()
                : activity.getFinalQrLatitude();
    }

    private Double getQrLongitude(Activity activity, Activity.AttendanceSession session) {
        return session == Activity.AttendanceSession.MIDDLE
                ? activity.getMiddleQrLongitude()
                : activity.getFinalQrLongitude();
    }

    private int getQrAllowedRadiusMeters(Activity activity, Activity.AttendanceSession session) {
        Integer radius = session == Activity.AttendanceSession.MIDDLE
                ? activity.getMiddleQrAllowedRadiusMeters()
                : activity.getFinalQrAllowedRadiusMeters();
        return radius == null ? DEFAULT_QR_LOCATION_RADIUS_METERS : radius;
    }

    private void validateLocationCoordinates(Double latitude, Double longitude, String missingMessage) {
        if (latitude == null || longitude == null) {
            throw new BadRequestException(missingMessage);
        }
        if (latitude < -90D || latitude > 90D || longitude < -180D || longitude > 180D) {
            throw new BadRequestException("Tọa độ vị trí không hợp lệ");
        }
    }

    private void validateLocationAccuracy(Double accuracyMeters) {
        if (accuracyMeters != null && accuracyMeters < 0D) {
            throw new BadRequestException("Sai số vị trí không hợp lệ");
        }
    }

    private double calculateDistanceMeters(Double latitude1, Double longitude1, Double latitude2, Double longitude2) {
        double lat1Rad = Math.toRadians(latitude1);
        double lat2Rad = Math.toRadians(latitude2);
        double deltaLatRad = Math.toRadians(latitude2 - latitude1);
        double deltaLonRad = Math.toRadians(longitude2 - longitude1);

        double a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2)
                + Math.cos(lat1Rad) * Math.cos(lat2Rad)
                * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    private Activity.AttendanceSession resolveQrSession(Activity activity, String qrCode) {
        QrPayload payload = parseQrPayload(qrCode);
        if (payload.activityId() != null && !payload.activityId().equals(activity.getId())) {
            throw new BadRequestException("Mã QR không thuộc hoạt động đang điểm danh");
        }
        String cleanCode = payload.code();
        LocalDateTime now = LocalDateTime.now();
        if (getAttendanceSessionCount(activity) == 3
                && cleanCode.equals(activity.getMiddleQrCode())
                && activity.getMiddleQrExpiresAt() != null
                && !now.isAfter(activity.getMiddleQrExpiresAt())) {
            return Activity.AttendanceSession.MIDDLE;
        }
        if (cleanCode.equals(activity.getFinalQrCode())
                && activity.getFinalQrExpiresAt() != null
                && !now.isAfter(activity.getFinalQrExpiresAt())) {
            return Activity.AttendanceSession.FINAL;
        }
        throw new BadRequestException("Mã QR không hợp lệ hoặc đã hết hạn");
    }

    private Activity resolveQrActivity(String qrCode) {
        QrPayload payload = parseQrPayload(qrCode);
        if (payload.activityId() != null) {
            return getActivity(payload.activityId());
        }
        if (payload.code().isBlank()) {
            throw new BadRequestException("Vui lòng quét mã QR điểm danh hợp lệ");
        }
        return activityRepository.findFirstByMiddleQrCodeOrFinalQrCode(payload.code(), payload.code())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hoạt động tương ứng với mã QR"));
    }

    private QrPayload parseQrPayload(String qrCode) {
        String cleanCode = qrCode == null ? "" : qrCode.trim();
        if (!cleanCode.startsWith("ACTIVITY_QR:")) {
            return new QrPayload(null, cleanCode);
        }

        String[] parts = cleanCode.split(":");
        if (parts.length != 4) {
            throw new BadRequestException("Mã QR điểm danh không đúng định dạng");
        }

        try {
            return new QrPayload(Long.valueOf(parts[1]), parts[3].trim());
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Mã QR điểm danh không chứa mã hoạt động hợp lệ");
        }
    }

    private void refreshAttendanceResult(Activity activity, ActivityRegistration registration, LocalDateTime fallbackTime) {
        boolean hasAnyCheckin = registration.isFaceVerified() || registration.isMiddleAttended() || registration.isFinalAttended();
        if (!hasAnyCheckin) {
            registration.setAttended(false);
            registration.setAttendanceResult(ActivityRegistration.AttendanceResult.NOT_ATTENDED);
            return;
        }

        if (!registration.isFaceVerified()) {
            registration.setAttended(false);
            registration.setAttendanceResult(ActivityRegistration.AttendanceResult.FACE_NOT_VERIFIED);
            return;
        }

        if (registration.getCheckinTime() == null) {
            registration.setCheckinTime(registration.getFaceVerifiedTime() != null ? registration.getFaceVerifiedTime() : fallbackTime);
        }

        boolean complete;
        int requiredSessions = getAttendanceSessionCount(activity);
        if (requiredSessions == 1) {
            complete = true;
        } else if (requiredSessions == 2) {
            complete = registration.isFinalAttended();
        } else {
            complete = registration.isMiddleAttended() && registration.isFinalAttended();
        }

        registration.setAttended(true);
        registration.setAttendanceResult(complete
                ? ActivityRegistration.AttendanceResult.ATTENDED
                : ActivityRegistration.AttendanceResult.INCOMPLETE);
    }

    private QrSessionResponse toQrSessionResponse(Activity activity, Activity.AttendanceSession session, String qrCode, LocalDateTime expiresAt) {
        return QrSessionResponse.builder()
                .session(session)
                .qrCode(qrCode)
                .qrPayload("ACTIVITY_QR:" + activity.getId() + ":" + session.name() + ":" + qrCode)
                .expiresAt(expiresAt)
                .locationRequired(isQrLocationRequired(activity, session))
                .latitude(getQrLatitude(activity, session))
                .longitude(getQrLongitude(activity, session))
                .accuracyMeters(session == Activity.AttendanceSession.MIDDLE
                        ? activity.getMiddleQrLocationAccuracyMeters()
                        : activity.getFinalQrLocationAccuracyMeters())
                .allowedRadiusMeters(getQrAllowedRadiusMeters(activity, session))
                .build();
    }

    private boolean isAdminOrSystem(String role) {
        return "ADMIN".equalsIgnoreCase(role) || "SYSTEM".equalsIgnoreCase(role);
    }

    private boolean isCheckerForActivity(Long activityId, String checkerCodeOrTsid) {
        if (checkerCodeOrTsid == null || checkerCodeOrTsid.isBlank()) {
            return false;
        }
        return checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(
                activityId,
                checkerCodeOrTsid.trim(),
                activityId,
                checkerCodeOrTsid.trim()
        );
    }

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record QrPayload(Long activityId, String code) {
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim()
                .replaceAll("\\s+", " ")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return Normalizer.normalize(normalized, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private ActivityResponse toResponse(Activity activity) {
        return toResponse(activity, null);
    }

    private ActivityResponse toResponse(Activity activity, String currentUserCode) {
        Long activityId = activity.getId();
        long registrationCount = registrationRepository.countByActivityId(activityId);
        Integer capacity = activity.getCapacity();
        boolean limitedActivity = getParticipationType(activity) == Activity.ParticipationType.LIMITED;
        boolean currentUserRegistered = limitedActivity
                && currentUserCode != null
                && !currentUserCode.isBlank()
                && registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(activityId, currentUserCode.trim());
        boolean registrationFull = limitedActivity && capacity != null && registrationCount >= capacity;
        boolean registrationOpen = limitedActivity
                && activity.getStatus() == Activity.Status.UPCOMING
                && activity.getRegistrationStartTime() != null
                && activity.getRegistrationEndTime() != null
                && !LocalDateTime.now().isBefore(activity.getRegistrationStartTime())
                && !LocalDateTime.now().isAfter(activity.getRegistrationEndTime())
                && !registrationFull;
        Integer remainingSlots = limitedActivity && capacity != null
                ? Math.max(capacity - (int) registrationCount, 0)
                : null;

        return ActivityResponse.builder()
                .id(activity.getId())
                .title(activity.getTitle())
                .category(activity.getCategory())
                .reward(activity.getReward())
                .participationType(getParticipationType(activity))
                .googleFormUrl(activity.getGoogleFormUrl())
                .registrationStartTime(activity.getRegistrationStartTime())
                .registrationEndTime(activity.getRegistrationEndTime())
                .location(activity.getLocation())
                .startTime(activity.getStartTime())
                .endTime(activity.getEndTime())
                .capacity(capacity)
                .attendanceSessionCount(getAttendanceSessionCount(activity))
                .middleQrExpiresAt(activity.getMiddleQrExpiresAt())
                .middleQrLocationRequired(activity.isMiddleQrLocationRequired())
                .middleQrAllowedRadiusMeters(activity.getMiddleQrAllowedRadiusMeters())
                .middleQrLatitude(activity.getMiddleQrLatitude())
                .middleQrLongitude(activity.getMiddleQrLongitude())
                .finalQrExpiresAt(activity.getFinalQrExpiresAt())
                .finalQrLocationRequired(activity.isFinalQrLocationRequired())
                .finalQrAllowedRadiusMeters(activity.getFinalQrAllowedRadiusMeters())
                .finalQrLatitude(activity.getFinalQrLatitude())
                .finalQrLongitude(activity.getFinalQrLongitude())
                .status(activity.getStatus())
                .createdBy(activity.getCreatedBy())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .registrationCount(registrationCount)
                .attendedCount(registrationRepository.countByActivityIdAndAttendedTrue(activityId))
                .faceVerifiedCount(registrationRepository.countByActivityIdAndFaceVerifiedTrue(activityId))
                .checkerCount(checkerRepository.countByActivityId(activityId))
                .currentUserRegistered(currentUserRegistered)
                .registrationOpen(registrationOpen)
                .registrationFull(registrationFull)
                .remainingSlots(remainingSlots)
                .build();
    }

    private RegistrationResponse toRegistrationResponse(ActivityRegistration registration) {
        Activity activity = registration.getActivity();
        return RegistrationResponse.builder()
                .id(registration.getId())
                .userTsid(registration.getUserTsid())
                .studentCode(registration.getStudentCode())
                .fullName(registration.getFullName())
                .classCode(registration.getClassCode())
                .activityId(activity.getId())
                .activityTitle(activity.getTitle())
                .activityCategory(activity.getCategory())
                .activityReward(activity.getReward())
                .activityLocation(activity.getLocation())
                .activityStartTime(activity.getStartTime())
                .activityEndTime(activity.getEndTime())
                .activityStatus(activity.getStatus())
                .activityAttendanceSessionCount(getAttendanceSessionCount(activity))
                .attended(registration.isAttended())
                .checkinTime(registration.getCheckinTime())
                .faceVerified(registration.isFaceVerified())
                .faceVerifiedTime(registration.getFaceVerifiedTime())
                .faceVerifiedBy(registration.getFaceVerifiedBy())
                .faceVerificationNote(registration.getFaceVerificationNote())
                .middleAttended(registration.isMiddleAttended())
                .middleCheckinTime(registration.getMiddleCheckinTime())
                .middleLocationVerified(registration.isMiddleLocationVerified())
                .middleLatitude(registration.getMiddleLatitude())
                .middleLongitude(registration.getMiddleLongitude())
                .middleLocationAccuracyMeters(registration.getMiddleLocationAccuracyMeters())
                .middleDistanceMeters(registration.getMiddleDistanceMeters())
                .finalAttended(registration.isFinalAttended())
                .finalCheckinTime(registration.getFinalCheckinTime())
                .finalLocationVerified(registration.isFinalLocationVerified())
                .finalLatitude(registration.getFinalLatitude())
                .finalLongitude(registration.getFinalLongitude())
                .finalLocationAccuracyMeters(registration.getFinalLocationAccuracyMeters())
                .finalDistanceMeters(registration.getFinalDistanceMeters())
                .attendanceResult(registration.getAttendanceResult())
                .build();
    }

    private CheckerResponse toCheckerResponse(ActivityChecker checker) {
        return CheckerResponse.builder()
                .id(checker.getId())
                .checkerTsid(checker.getCheckerTsid())
                .checkerCode(checker.getCheckerCode())
                .checkerName(checker.getCheckerName())
                .build();
    }
}
