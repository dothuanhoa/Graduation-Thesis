package com.activityservice.service;

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
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final ActivityCheckerRepository checkerRepository;

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
        if (activity.getStatus() != Activity.Status.UPCOMING) {
            throw new BadRequestException("Chỉ được import danh sách đăng ký trước khi hoạt động ONGOING");
        }

        int imported = 0;
        int skipped = 0;
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
                String userTsid = readString(row, 2);

                if (studentCode.isBlank()) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": MSSV trống");
                    continue;
                }

                if (registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(activityId, studentCode)) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": MSSV " + studentCode + " đã tồn tại trong hoạt động");
                    continue;
                }

                ActivityRegistration registration = new ActivityRegistration();
                registration.setActivity(activity);
                registration.setStudentCode(studentCode);
                registration.setFullName(fullName);
                registration.setUserTsid(userTsid.isBlank() ? studentCode : userTsid);
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

    public List<RegistrationResponse> getRegistrations(Long activityId) {
        getActivity(activityId);
        return registrationRepository.findByActivityIdOrderByStudentCodeAsc(activityId)
                .stream()
                .map(this::toRegistrationResponse)
                .toList();
    }

    @Transactional
    public CheckerResponse addChecker(Long activityId, CheckerRequest request) {
        Activity activity = getActivity(activityId);
        if (activity.getStatus() == Activity.Status.COMPLETED) {
            throw new BadRequestException("Không được thêm checker cho hoạt động đã COMPLETED");
        }
        if (checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCase(activityId, request.getCheckerTsid())
                || checkerRepository.existsByActivityIdAndCheckerCodeIgnoreCase(activityId, request.getCheckerCode())) {
            throw new BadRequestException("Checker đã được phân quyền cho hoạt động này");
        }

        ActivityChecker checker = new ActivityChecker();
        checker.setActivity(activity);
        checker.setCheckerTsid(request.getCheckerTsid());
        checker.setCheckerCode(request.getCheckerCode());
        checker.setCheckerName(request.getCheckerName());
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

        ActivityRegistration registration = registrationRepository
                .findByActivityIdAndStudentCodeIgnoreCase(activityId, request.getStudentCode())
                .orElseThrow(() -> new ResourceNotFoundException("MSSV không nằm trong danh sách đăng ký hợp lệ"));

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
        activity.setGoogleFormUrl(request.getGoogleFormUrl());
        activity.setLocation(request.getLocation());
        activity.setStartTime(request.getStartTime());
        activity.setEndTime(request.getEndTime());
        activity.setCapacity(request.getCapacity());
    }

    private void validateTimeWindow(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime != null && endTime != null && !endTime.isAfter(startTime)) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private ActivityResponse toResponse(Activity activity) {
        Long activityId = activity.getId();
        return ActivityResponse.builder()
                .id(activity.getId())
                .title(activity.getTitle())
                .category(activity.getCategory())
                .reward(activity.getReward())
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
