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
import com.activityservice.dto.FaceVerificationResponse;
import com.activityservice.dto.QrCheckinRequest;
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
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private static final String INTERNAL_ROLE = "SYSTEM";
    private static final String INTERNAL_USER_CODE = "activity-service";

    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final ActivityCheckerRepository checkerRepository;
    private final UserClient userClient;

    public List<ActivityResponse> findAll(String currentUserCode) {
        return activityRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(activity -> toResponse(activity, currentUserCode))
                .toList();
    }

    public ActivityResponse findById(Long id, String currentUserCode) {
        return toResponse(getActivity(id), currentUserCode);
    }

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
            throw new BadRequestException("Chỉ được chỉnh sửa hoạt động ở trạng thái UPCOMING");
        }

        applyRequest(activity, request);
        return toResponse(activityRepository.save(activity));
    }

    @Transactional
    public ActivityResponse updateStatus(Long id, Activity.Status nextStatus) {
        Activity activity = getActivity(id);
        Activity.Status currentStatus = activity.getStatus();

        if (currentStatus == Activity.Status.COMPLETED) {
            throw new BadRequestException("Hoạt động đã COMPLETED không được chuyển trạng thái");
        }
        if (currentStatus == Activity.Status.UPCOMING && nextStatus == Activity.Status.COMPLETED) {
            throw new BadRequestException("Hoạt động phải chuyển sang ONGOING trước khi COMPLETED");
        }
        if (currentStatus == Activity.Status.ONGOING && nextStatus == Activity.Status.UPCOMING) {
            throw new BadRequestException("Không được chuyển ngược hoạt động từ ONGOING về UPCOMING");
        }

        activity.setStatus(nextStatus);
        return toResponse(activityRepository.save(activity));
    }

    @Transactional
    public void delete(Long id) {
        Activity activity = getActivity(id);
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Chỉ được xóa hoạt động ở trạng thái UPCOMING");
        }
        activityRepository.delete(activity);
    }

    public List<RegistrationResponse> getRegistrations(Long activityId) {
        getActivity(activityId);
        return registrationRepository.findByActivityIdOrderByStudentCodeAsc(activityId)
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
        if (registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(activityId, cleanStudentCode)
                || registrationRepository.existsByActivityIdAndUserTsidIgnoreCase(activityId, cleanStudentCode)) {
            throw new BadRequestException("Bạn đã đăng ký hoạt động này");
        }

        long registrationCount = registrationRepository.countByActivityId(activityId);
        if (activity.getCapacity() != null && registrationCount >= activity.getCapacity()) {
            throw new BadRequestException("Hoạt động đã đủ số lượng đăng ký");
        }

        UserProfileDTO studentProfile = requireExistingStudent(cleanStudentCode, "sinh viên");

        ActivityRegistration registration = new ActivityRegistration();
        registration.setActivity(activity);
        registration.setStudentCode(studentProfile.getStudentId().trim());
        registration.setFullName(studentProfile.getFullName().trim());
        registration.setUserTsid(studentProfile.getStudentId().trim());

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
            throw new BadRequestException("Không được thêm checker cho hoạt động đã COMPLETED");
        }

        String checkerCode = request.getCheckerCode().trim();
        String checkerName = request.getCheckerName().trim();
        String checkerTsid = request.getCheckerTsid() == null || request.getCheckerTsid().isBlank()
                ? checkerCode
                : request.getCheckerTsid().trim();
        UserProfileDTO checkerProfile = requireMatchingStudent(checkerCode, checkerName, "người điểm danh");

        if (checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCase(activityId, checkerTsid)
                || checkerRepository.existsByActivityIdAndCheckerCodeIgnoreCase(activityId, checkerCode)) {
            throw new BadRequestException("Checker đã được phân quyền cho hoạt động này");
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
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy checker"));
        if (!checker.getActivity().getId().equals(activityId)) {
            throw new BadRequestException("Checker không thuộc hoạt động này");
        }
        checkerRepository.delete(checker);
    }

    @Transactional
    public RegistrationResponse checkin(Long activityId, String checkerCodeOrTsid, CheckinRequest request) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Chỉ được điểm danh khi hoạt động đang ONGOING");
        }

        if (!checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(
                activityId,
                checkerCodeOrTsid,
                activityId,
                checkerCodeOrTsid
        )) {
            throw new ForbiddenException("Tài khoản hiện tại không được ủy quyền điểm danh hoạt động này");
        }

        ActivityRegistration registration = resolveCheckinRegistration(activity, request.getStudentCode());
        LocalDateTime now = LocalDateTime.now();
        if (!registration.isFaceVerified()) {
            registration.setFaceVerified(true);
            registration.setFaceVerifiedTime(now);
        }
        refreshAttendanceResult(activity, registration, now);
        return toRegistrationResponse(registrationRepository.save(registration));
    }

    @Transactional
    public QrSessionResponse createQrSession(Long activityId, Activity.AttendanceSession session, Integer expiresInMinutes) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Ch? t?o QR khi ho?t ??ng ?ang di?n ra");
        }
        requireQrSessionAllowed(activity, session);

        int minutes = expiresInMinutes == null ? 10 : expiresInMinutes;
        if (minutes < 1 || minutes > 240) {
            throw new BadRequestException("Th?i gian t?n t?i QR ph?i t? 1 ??n 240 ph?t");
        }

        String qrCode = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(minutes);
        if (session == Activity.AttendanceSession.MIDDLE) {
            activity.setMiddleQrCode(qrCode);
            activity.setMiddleQrExpiresAt(expiresAt);
        } else {
            activity.setFinalQrCode(qrCode);
            activity.setFinalQrExpiresAt(expiresAt);
        }
        activityRepository.save(activity);
        return toQrSessionResponse(activity, session, qrCode, expiresAt);
    }

    @Transactional
    public RegistrationResponse faceCheckin(Long activityId, String currentStudentCode, String requestedStudentCode, MultipartFile faceImage) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Chi duoc xac thuc khuon mat khi hoat dong dang dien ra");
        }

        String studentCode = requestedStudentCode != null && !requestedStudentCode.isBlank()
                ? requestedStudentCode.trim()
                : currentStudentCode;
        if (studentCode == null || studentCode.isBlank()) {
            throw new BadRequestException("Khong xac dinh duoc sinh vien can xac thuc khuon mat");
        }

        UserProfileDTO studentProfile = requireExistingStudent(studentCode, "sinh vien");
        FaceVerificationResponse verification;
        try {
            verification = userClient.verifyStudentFace(INTERNAL_ROLE, INTERNAL_USER_CODE, studentProfile.getStudentId(), faceImage);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Sinh vien " + studentProfile.getStudentId() + " chua co anh khuon mat mau");
        } catch (FeignException ex) {
            throw new BadRequestException("Khong xac thuc duoc khuon mat sinh vien " + studentProfile.getStudentId() + ", vui long thu lai");
        }
        if (verification == null || !verification.isVerified()) {
            String detail = verification != null && verification.getSimilarity() != null
                    ? " Do tuong dong: " + String.format(Locale.ROOT, "%.2f", verification.getSimilarity()) + "%"
                    : "";
            throw new BadRequestException("Khuon mat khong khop voi anh mau cua sinh vien " + studentProfile.getStudentId() + "." + detail);
        }

        ActivityRegistration registration = resolveCheckinRegistration(activity, studentProfile.getStudentId());
        LocalDateTime now = LocalDateTime.now();
        registration.setFaceVerified(true);
        registration.setFaceVerifiedTime(now);
        refreshAttendanceResult(activity, registration, now);
        return toRegistrationResponse(registrationRepository.save(registration));
    }

    @Transactional
    public RegistrationResponse qrCheckin(Long activityId, String studentCode, QrCheckinRequest request) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() != Activity.Status.ONGOING) {
            throw new BadRequestException("Ch? ???c qu?t QR khi ho?t ??ng ?ang di?n ra");
        }
        if (getParticipationType(activity) == Activity.ParticipationType.OPEN) {
            throw new BadRequestException("Ho?t ??ng t? do ch? ?i?m danh b?ng x?c th?c khu?n m?t");
        }
        if (studentCode == null || studentCode.isBlank()) {
            throw new BadRequestException("Kh?ng x?c ??nh ???c sinh vi?n ?ang ??ng nh?p");
        }

        Activity.AttendanceSession session = resolveQrSession(activity, request.getQrCode());
        ActivityRegistration registration = registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activityId, studentCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("MSSV kh?ng n?m trong danh s?ch ??ng k? h?p l?"));

        LocalDateTime now = LocalDateTime.now();
        if (session == Activity.AttendanceSession.MIDDLE) {
            registration.setMiddleAttended(true);
            registration.setMiddleCheckinTime(now);
        } else {
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

    private ActivityRegistration resolveCheckinRegistration(Activity activity, String studentCode) {
        Long activityId = activity.getId();
        String cleanStudentCode = studentCode.trim();
        if (getParticipationType(activity) == Activity.ParticipationType.LIMITED) {
            return registrationRepository
                    .findByActivityIdAndStudentCodeIgnoreCase(activityId, cleanStudentCode)
                    .orElseThrow(() -> new ResourceNotFoundException("MSSV không nằm trong danh sách đăng ký hợp lệ"));
        }

        return registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activityId, cleanStudentCode)
                .orElseGet(() -> createOpenActivityRegistration(activity, cleanStudentCode));
    }

    private ActivityRegistration createOpenActivityRegistration(Activity activity, String studentCode) {
        UserProfileDTO studentProfile = requireExistingStudent(studentCode, "sinh viên");
        ActivityRegistration registration = new ActivityRegistration();
        registration.setActivity(activity);
        registration.setStudentCode(studentProfile.getStudentId().trim());
        registration.setFullName(studentProfile.getFullName().trim());
        registration.setUserTsid(studentProfile.getStudentId().trim());
        return registrationRepository.save(registration);
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
            throw new BadRequestException("Ho?t ??ng gi?i h?n ch? ???c ch?n 2 ho?c 3 l?n ?i?m danh");
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
            throw new BadRequestException("Ho?t ??ng t? do kh?ng s? d?ng QR ?i?m danh");
        }
        if (session == null || session == Activity.AttendanceSession.FACE) {
            throw new BadRequestException("Ch? ???c t?o QR cho m?c gi?a gi? ho?c cu?i gi?");
        }
        if (session == Activity.AttendanceSession.MIDDLE && getAttendanceSessionCount(activity) != 3) {
            throw new BadRequestException("Ho?t ??ng n?y kh?ng c?u h?nh ?i?m danh gi?a gi?");
        }
    }

    private Activity.AttendanceSession resolveQrSession(Activity activity, String qrCode) {
        String cleanCode = qrCode == null ? "" : qrCode.trim();
        if (cleanCode.startsWith("ACTIVITY_QR:")) {
            String[] parts = cleanCode.split(":");
            cleanCode = parts.length == 4 ? parts[3] : cleanCode;
        }
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
        throw new BadRequestException("M? QR kh?ng h?p l? ho?c ?? h?t h?n");
    }

    private void refreshAttendanceResult(Activity activity, ActivityRegistration registration, LocalDateTime fallbackTime) {
        boolean hasAnyCheckin = registration.isFaceVerified() || registration.isMiddleAttended() || registration.isFinalAttended();
        if (!hasAnyCheckin) {
            registration.setAttended(false);
            registration.setCheckinTime(null);
            registration.setAttendanceResult(ActivityRegistration.AttendanceResult.NOT_ATTENDED);
            return;
        }

        if (!registration.isFaceVerified()) {
            registration.setAttended(false);
            registration.setCheckinTime(resolveLatestCheckinTime(registration, fallbackTime));
            registration.setAttendanceResult(ActivityRegistration.AttendanceResult.FACE_NOT_VERIFIED);
            return;
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

        registration.setAttended(complete);
        registration.setCheckinTime(complete ? resolveLatestCheckinTime(registration, fallbackTime) : null);
        registration.setAttendanceResult(complete
                ? ActivityRegistration.AttendanceResult.ATTENDED
                : ActivityRegistration.AttendanceResult.INCOMPLETE);
    }

    private LocalDateTime resolveLatestCheckinTime(ActivityRegistration registration, LocalDateTime fallbackTime) {
        if (registration.getFinalCheckinTime() != null) {
            return registration.getFinalCheckinTime();
        }
        if (registration.getMiddleCheckinTime() != null) {
            return registration.getMiddleCheckinTime();
        }
        if (registration.getFaceVerifiedTime() != null) {
            return registration.getFaceVerifiedTime();
        }
        return fallbackTime;
    }

    private QrSessionResponse toQrSessionResponse(Activity activity, Activity.AttendanceSession session, String qrCode, LocalDateTime expiresAt) {
        return QrSessionResponse.builder()
                .session(session)
                .qrCode(qrCode)
                .qrPayload("ACTIVITY_QR:" + activity.getId() + ":" + session.name() + ":" + qrCode)
                .expiresAt(expiresAt)
                .build();
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
                .finalQrExpiresAt(activity.getFinalQrExpiresAt())
                .status(activity.getStatus())
                .createdBy(activity.getCreatedBy())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .registrationCount(registrationCount)
                .attendedCount(registrationRepository.countByActivityIdAndAttendedTrue(activityId))
                .checkerCount(checkerRepository.countByActivityId(activityId))
                .currentUserRegistered(currentUserRegistered)
                .registrationOpen(registrationOpen)
                .registrationFull(registrationFull)
                .remainingSlots(remainingSlots)
                .build();
    }

    private RegistrationResponse toRegistrationResponse(ActivityRegistration registration) {
        return RegistrationResponse.builder()
                .id(registration.getId())
                .userTsid(registration.getUserTsid())
                .studentCode(registration.getStudentCode())
                .fullName(registration.getFullName())
                .attended(registration.isAttended())
                .checkinTime(registration.getCheckinTime())
                .faceVerified(registration.isFaceVerified())
                .faceVerifiedTime(registration.getFaceVerifiedTime())
                .middleAttended(registration.isMiddleAttended())
                .middleCheckinTime(registration.getMiddleCheckinTime())
                .finalAttended(registration.isFinalAttended())
                .finalCheckinTime(registration.getFinalCheckinTime())
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
