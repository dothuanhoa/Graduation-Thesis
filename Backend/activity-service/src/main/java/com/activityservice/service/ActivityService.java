package com.activityservice.service;

import com.activityservice.client.UserClient;
import com.activityservice.domain.Activity;
import com.activityservice.domain.ActivityChecker;
import com.activityservice.domain.ActivityRegistration;
import com.activityservice.dto.*;
import com.activityservice.exception.BadRequestException;
import com.activityservice.exception.ForbiddenException;
import com.activityservice.exception.ResourceNotFoundException;
import com.activityservice.repository.ActivityCheckerRepository;
import com.activityservice.repository.ActivityRegistrationRepository;
import com.activityservice.repository.ActivityRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final ActivityCheckerRepository checkerRepository;
    private final UserClient userClient;

    public List<ActivityResponse> findAll() {
        return activityRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public ActivityResponse findById(Long id) {
        return toResponse(getActivity(id));
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

        Activity activity = new Activity();
        applyRequest(activity, request);
        activity.setCreatedBy(createdBy);
        activity.setStatus(Activity.Status.UPCOMING);
        return toResponse(activityRepository.save(activity));
    }

    @Transactional
    public ActivityResponse update(Long id, ActivityRequest request) {
        validateTimeWindow(request.getStartTime(), request.getEndTime());

        Activity activity = getActivity(id);
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

    @Transactional
    public ImportResult importRegistrations(Long activityId, MultipartFile file) {
        Activity activity = getActivity(activityId);
        requireLimitedActivity(activity);
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Chỉ được import danh sách đăng ký trước khi hoạt động ONGOING");
        }

        int imported = 0;
        int skipped = 0;
        long currentRegistrationCount = registrationRepository.countByActivityId(activityId);
        List<String> errors = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream(); Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            int rowNumber = 0;

            while (rows.hasNext()) {
                Row row = rows.next();
                rowNumber++;
                if (rowNumber == 1) {
                    continue;
                }

                String studentCode = readString(row, 0);
                String fullName = readString(row, 1);
                String userTsid = studentCode;

                if (studentCode.isBlank()) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": MSSV trống");
                    continue;
                }

                if (fullName.isBlank()) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": Họ tên trống");
                    continue;
                }

                if (registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(activityId, studentCode)
                        || registrationRepository.existsByActivityIdAndUserTsidIgnoreCase(activityId, userTsid)) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": MSSV " + studentCode + " đã tồn tại trong hoạt động");
                    continue;
                }

                if (activity.getCapacity() != null && currentRegistrationCount + imported >= activity.getCapacity()) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": Hoạt động đã đủ số lượng tối đa");
                    continue;
                }

                UserProfileDTO studentProfile;
                try {
                    studentProfile = requireMatchingStudent(studentCode, fullName, "sinh viên");
                } catch (BadRequestException ex) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": " + ex.getMessage());
                    continue;
                }

                ActivityRegistration registration = new ActivityRegistration();
                registration.setActivity(activity);
                registration.setStudentCode(studentProfile.getStudentId().trim());
                registration.setFullName(studentProfile.getFullName().trim());
                registration.setUserTsid(userTsid);
                registrationRepository.save(registration);
                imported++;
            }
        } catch (Exception ex) {
            throw new BadRequestException("Không đọc được file Excel: " + ex.getMessage());
        }

        return ImportResult.builder()
                .imported(imported)
                .skipped(skipped)
                .errors(errors)
                .build();
    }

    public byte[] createRegistrationImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh sach tham gia");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("MSSV");
            header.createCell(1).setCellValue("Họ tên");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("DH52200694");
            sample.createCell(1).setCellValue("Đỗ Thuận Hòa");

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new BadRequestException("Không tạo được file mẫu import: " + ex.getMessage());
        }
    }

    public List<RegistrationResponse> getRegistrations(Long activityId) {
        getActivity(activityId);
        return registrationRepository.findByActivityIdOrderByStudentCodeAsc(activityId)
                .stream()
                .map(this::toRegistrationResponse)
                .toList();
    }

    @Transactional
    public void removeRegistration(Long activityId, Long registrationId) {
        Activity activity = getActivity(activityId);
        requireLimitedActivity(activity);
        ActivityRegistration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sinh viên đăng ký"));

        if (!registration.getActivity().getId().equals(activityId)) {
            throw new BadRequestException("Sinh viên đăng ký không thuộc hoạt động này");
        }
        if (registration.isAttended()) {
            throw new BadRequestException("Sinh viên đã điểm danh nên không thể gỡ khỏi danh sách");
        }

        registrationRepository.delete(registration);
    }

    @Transactional
    public RegistrationResponse addRegistration(Long activityId, RegistrationRequest request) {
        Activity activity = getActivity(activityId);
        requireLimitedActivity(activity);
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Chỉ được thêm sinh viên đăng ký trước khi hoạt động ONGOING");
        }

        String studentCode = request.getStudentCode().trim();
        String fullName = request.getFullName().trim();
        String userTsid = studentCode;

        if (registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(activityId, studentCode)) {
            throw new BadRequestException("MSSV " + studentCode + " đã tồn tại trong hoạt động");
        }
        if (registrationRepository.existsByActivityIdAndUserTsidIgnoreCase(activityId, userTsid)) {
            throw new BadRequestException("MSSV " + studentCode + " đã tồn tại trong hoạt động");
        }
        if (activity.getCapacity() != null && registrationRepository.countByActivityId(activityId) >= activity.getCapacity()) {
            throw new BadRequestException("Hoạt động đã đủ số lượng tối đa");
        }

        UserProfileDTO studentProfile = requireMatchingStudent(studentCode, fullName, "sinh viên");

        ActivityRegistration registration = new ActivityRegistration();
        registration.setActivity(activity);
        registration.setStudentCode(studentProfile.getStudentId().trim());
        registration.setFullName(studentProfile.getFullName().trim());
        registration.setUserTsid(userTsid);
        return toRegistrationResponse(registrationRepository.save(registration));
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
        } else {
            activity.setGoogleFormUrl(request.getGoogleFormUrl() == null ? "" : request.getGoogleFormUrl().trim());
            activity.setCapacity(request.getCapacity());
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

        ActivityRegistration registration = registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activityId, cleanStudentCode)
                .orElseGet(() -> createOpenActivityRegistration(activity, cleanStudentCode));
        return registration;
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
        if (startTime != null && endTime != null && !endTime.isAfter(startTime)) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private UserProfileDTO requireMatchingStudent(String studentCode, String fullName, String subjectLabel) {
        UserProfileDTO profile;
        try {
            profile = userClient.getStudentProfile(studentCode);
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
            profile = userClient.getStudentProfile(studentCode);
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
        Long activityId = activity.getId();
        return ActivityResponse.builder()
                .id(activity.getId())
                .title(activity.getTitle())
                .category(activity.getCategory())
                .reward(activity.getReward())
                .participationType(getParticipationType(activity))
                .googleFormUrl(activity.getGoogleFormUrl())
                .location(activity.getLocation())
                .startTime(activity.getStartTime())
                .endTime(activity.getEndTime())
                .capacity(activity.getCapacity())
                .status(activity.getStatus())
                .createdBy(activity.getCreatedBy())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .registrationCount(registrationRepository.countByActivityId(activityId))
                .attendedCount(registrationRepository.countByActivityIdAndAttendedTrue(activityId))
                .checkerCount(checkerRepository.countByActivityId(activityId))
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

    private String readString(Row row, int index) {
        Cell cell = row.getCell(index, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell).trim();
    }
}
