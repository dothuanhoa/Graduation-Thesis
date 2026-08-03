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

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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

        if (!registration.isAttended()) {
            registration.setAttended(true);
            registration.setCheckinTime(LocalDateTime.now());
        }
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
        activity.setParticipationType(resolveParticipationType(request.getParticipationType()));
        if (activity.getParticipationType() == Activity.ParticipationType.OPEN) {
            activity.setGoogleFormUrl("");
            activity.setCapacity(null);
            activity.setRegistrationStartTime(null);
            activity.setRegistrationEndTime(null);
        } else {
            activity.setGoogleFormUrl("");
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
