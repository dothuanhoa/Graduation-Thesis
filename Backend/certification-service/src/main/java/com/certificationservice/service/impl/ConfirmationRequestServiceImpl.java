package com.certificationservice.service.impl;

import com.certificationservice.client.UserClient;
import com.certificationservice.domain.ConfirmationRequest;
import com.certificationservice.domain.FormType;
import com.certificationservice.domain.enums.RequestStatus;
import com.certificationservice.dto.BulkUpdateStatusDTO;
import com.certificationservice.dto.ConfirmationRequestDTO;
import com.certificationservice.dto.CreateConfirmationRequestDTO;
import com.certificationservice.dto.UpdateProofFileDTO;
import com.certificationservice.dto.UpdateStatusDTO;
import com.certificationservice.dto.UserProfileDTO;
import com.certificationservice.exception.ResourceNotFoundException;
import com.certificationservice.repository.ConfirmationRequestRepository;
import com.certificationservice.repository.FormTypeRepository;
import com.certificationservice.service.ConfirmationRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfirmationRequestServiceImpl implements ConfirmationRequestService {
    private static final int MAX_METADATA_KEY_LENGTH = 50;
    private static final int MAX_METADATA_TEXT_LENGTH = 500;
    private static final List<RequiredMetadataField> COMMON_REQUIRED_METADATA_FIELDS = List.of(
            new RequiredMetadataField("fullName", "Họ và tên"),
            new RequiredMetadataField("studentId", "Mã số sinh viên"),
            new RequiredMetadataField("dob", "Ngày sinh"),
            new RequiredMetadataField("gender", "Giới tính"),
            new RequiredMetadataField("contactPhone", "Số điện thoại"),
            new RequiredMetadataField("classCode", "Lớp"),
            new RequiredMetadataField("facultyName", "Khoa"),
            new RequiredMetadataField("educationLevel", "Bậc đào tạo"),
            new RequiredMetadataField("trainingType", "Hệ đào tạo"),
            new RequiredMetadataField("requestDate", "Ngày làm đơn")
    );
    private static final Map<String, List<RequiredMetadataField>> REQUIRED_METADATA_BY_FORM_CODE = Map.of(
            "NVQS", List.of(
                    new RequiredMetadataField("permanentAddress", "Hộ khẩu thường trú"),
                    new RequiredMetadataField("academicYear", "Khóa học"),
                    new RequiredMetadataField("requestSchoolYear", "Năm học"),
                    new RequiredMetadataField("reason", "Lý do xác nhận")
            ),
            "KHAC", List.of(
                    new RequiredMetadataField("permanentAddress", "Hộ khẩu thường trú"),
                    new RequiredMetadataField("reason", "Lý do/yêu cầu xác nhận"),
                    new RequiredMetadataField("deductionType", "Xác nhận giảm trừ gia cảnh")
            ),
            "VAY_VON", List.of(
                    new RequiredMetadataField("cmnd", "CMND/CCCD"),
                    new RequiredMetadataField("issueDate", "Ngày cấp CMND/CCCD"),
                    new RequiredMetadataField("issuePlace", "Nơi cấp CMND/CCCD"),
                    new RequiredMetadataField("schoolCode", "Mã trường"),
                    new RequiredMetadataField("schoolName", "Tên trường"),
                    new RequiredMetadataField("major", "Ngành học"),
                    new RequiredMetadataField("academicYear", "Khóa học"),
                    new RequiredMetadataField("enrollmentDate", "Ngày nhập học"),
                    new RequiredMetadataField("graduationMonth", "Tháng ra trường dự kiến"),
                    new RequiredMetadataField("graduationYear", "Năm ra trường dự kiến"),
                    new RequiredMetadataField("studyDurationMonths", "Thời gian học tại trường"),
                    new RequiredMetadataField("monthlyTuition", "Học phí hằng tháng"),
                    new RequiredMetadataField("tuitionSupportType", "Diện miễn/giảm học phí"),
                    new RequiredMetadataField("orphanStatus", "Đối tượng mồ côi"),
                    new RequiredMetadataField("bankAccount", "Số tài khoản của nhà trường"),
                    new RequiredMetadataField("principalName", "Người ký xác nhận")
            )
    );
    private static final Set<String> VALID_GENDERS = Set.of("Nam", "Nữ");
    private static final Set<String> VALID_DEDUCTION_TYPES = Set.of("Có", "Không");
    private static final Set<String> VALID_TUITION_SUPPORT_TYPES =
            Set.of("Không miễn giảm", "Giảm học phí", "Miễn học phí");
    private static final Set<String> VALID_ORPHAN_STATUSES = Set.of("Mồ côi", "Không mồ côi");

    private final ConfirmationRequestRepository requestRepository;
    private final FormTypeRepository formTypeRepository;
    private final UserClient userClient;

    @Override
    @Transactional
    public ConfirmationRequestDTO createRequest(String studentId, CreateConfirmationRequestDTO dto) {
        FormType formType = formTypeRepository.findById(dto.getFormTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại form này"));
        
        if (!Boolean.TRUE.equals(formType.getIsActive())) {
            throw new IllegalArgumentException("Loại form này hiện không hoạt động");
        }

        Map<String, Object> metadata = validateAndNormalizeMetadata(studentId, formType, dto);
        String semester = cleanText(dto.getSemester());
        boolean exists = requestRepository.existsByStudentIdAndFormTypeIdAndSemesterAndStatusNot(
                studentId, dto.getFormTypeId(), semester, RequestStatus.CANCELLED);
        if (exists) {
            throw new IllegalArgumentException("Bạn đã gửi yêu cầu này trong học kỳ " + semester + " rồi");
        }

        ConfirmationRequest request = new ConfirmationRequest();
        request.setStudentId(studentId);
        request.setFormType(formType);
        request.setReason(cleanText(dto.getReason()));
        request.setContactPhone(cleanText(dto.getContactPhone()));
        request.setProofFileUrl(cleanText(dto.getProofFileUrl()));
        request.setSemester(semester);
        request.setMetadata(metadata);
        request.setStatus(RequestStatus.PENDING);

        ConfirmationRequest saved = requestRepository.save(request);
        return mapToDTO(saved, false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConfirmationRequestDTO> getMyRequests(String studentId) {
        return requestRepository.findByStudentIdOrderByCreatedAtDesc(studentId)
                .stream()
                .map(req -> mapToDTO(req, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ConfirmationRequestDTO getRequestDetail(Long id) {
        ConfirmationRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu: " + id));
        return mapToDTO(request, true);
    }

    @Override
    @Transactional
    public void cancelRequest(Long id, String studentId) {
        ConfirmationRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu: " + id));

        if (!request.getStudentId().equals(studentId)) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đơn này");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể hủy đơn khi đang ở trạng thái Chờ duyệt (PENDING)");
        }

        request.setStatus(RequestStatus.CANCELLED);
        requestRepository.save(request);
    }

    @Override
    @Transactional
    public ConfirmationRequestDTO updateProofFile(Long id, String studentId, UpdateProofFileDTO dto) {
        ConfirmationRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu: " + id));

        if (!request.getStudentId().equals(studentId)) {
            throw new IllegalArgumentException("Bạn không có quyền cập nhật minh chứng cho đơn này");
        }

        if (request.getStatus() != RequestStatus.NEEDS_INFO) {
            throw new IllegalArgumentException("Chỉ có thể bổ sung minh chứng khi đơn đang cần thông tin");
        }

        request.setProofFileUrl(dto.getProofFileUrl());
        ConfirmationRequest saved = requestRepository.save(request);
        return mapToDTO(saved, false);
    }

    @Override
    @Transactional
    public ConfirmationRequestDTO updateRequestStatus(Long id, UpdateStatusDTO dto) {
        ConfirmationRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu: " + id));
        
        request.setStatus(dto.getStatus());
        if (dto.getAdminNote() != null) {
            request.setAdminNote(dto.getAdminNote());
        }
        if (dto.getAppointmentDate() != null) {
            request.setAppointmentDate(dto.getAppointmentDate());
        }
        if (dto.getMetadata() != null) {
            if (request.getMetadata() == null) {
                request.setMetadata(dto.getMetadata());
            } else {
                request.getMetadata().putAll(dto.getMetadata());
            }
        }

        ConfirmationRequest saved = requestRepository.save(request);
        return mapToDTO(saved, true);
    }

    @Override
    @Transactional
    public List<ConfirmationRequestDTO> updateRequestStatuses(BulkUpdateStatusDTO dto) {
        if (dto.getStatus() == null
                && dto.getAppointmentDate() == null
                && dto.getAdminNote() == null
                && dto.getMetadata() == null) {
            throw new IllegalArgumentException("Vui lòng chọn thông tin cần cập nhật");
        }

        Set<Long> requestIds = new LinkedHashSet<>(dto.getRequestIds());
        List<ConfirmationRequest> requests = requestRepository.findAllById(requestIds);
        if (requests.size() != requestIds.size()) {
            Set<Long> foundIds = requests.stream()
                    .map(ConfirmationRequest::getId)
                    .collect(Collectors.toSet());
            String missingIds = requestIds.stream()
                    .filter(requestId -> !foundIds.contains(requestId))
                    .map(String::valueOf)
                    .collect(Collectors.joining(", "));
            throw new ResourceNotFoundException("Không tìm thấy đơn: " + missingIds);
        }

        requests.forEach(request -> applyBulkUpdate(request, dto));
        return requestRepository.saveAll(requests)
                .stream()
                .map(request -> mapToDTO(request, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ConfirmationRequestDTO> getAllRequests(Pageable pageable) {
        return requestRepository.findAll(pageable)
                .map(req -> mapToDTO(req, false)); // Để nhẹ, getAll không fetch UserProfile. Detail mới fetch.
    }

    private Map<String, Object> validateAndNormalizeMetadata(
            String studentId,
            FormType formType,
            CreateConfirmationRequestDTO dto
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (dto.getMetadata() != null) {
            dto.getMetadata().forEach((key, value) -> {
                if (key == null || key.isBlank()) {
                    throw new IllegalArgumentException("Tên trường dữ liệu trên đơn không được để trống");
                }
                String cleanKey = key.trim();
                if (cleanKey.length() > MAX_METADATA_KEY_LENGTH) {
                    throw new IllegalArgumentException("Tên trường dữ liệu trên đơn không được vượt quá "
                            + MAX_METADATA_KEY_LENGTH + " ký tự");
                }
                metadata.put(cleanKey, normalizeMetadataValue(cleanKey, value));
            });
        }

        String formCode = resolveFormCode(formType);
        metadata.put("reason", cleanText(dto.getReason()));
        metadata.put("contactPhone", cleanText(dto.getContactPhone()));
        metadata.put("semester", cleanText(dto.getSemester()));
        metadata.put("formCode", formCode);
        metadata.put("formTypeName", cleanText(formType.getName()));

        String metadataStudentId = metadataText(metadata, "studentId");
        if (metadataStudentId.isBlank()) {
            metadata.put("studentId", studentId);
        } else if (!metadataStudentId.equals(studentId)) {
            throw new IllegalArgumentException("Mã số sinh viên trên đơn không khớp với tài khoản đang đăng nhập");
        }

        List<String> missingFields = requiredMetadataFields(formCode).stream()
                .filter(field -> metadataText(metadata, field.key()).isBlank())
                .map(RequiredMetadataField::label)
                .collect(Collectors.toList());
        if (!missingFields.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập đầy đủ thông tin trên đơn: "
                    + String.join(", ", missingFields));
        }

        validateMetadataOptions(metadata);
        validateNumericMetadata(metadata);
        return metadata;
    }

    private Object normalizeMetadataValue(String key, Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String textValue) {
            String cleanValue = cleanText(textValue);
            if (cleanValue.length() > MAX_METADATA_TEXT_LENGTH) {
                throw new IllegalArgumentException("Giá trị '" + key + "' không được vượt quá "
                        + MAX_METADATA_TEXT_LENGTH + " ký tự");
            }
            if (cleanValue.contains("<") || cleanValue.contains(">")) {
                throw new IllegalArgumentException("Giá trị '" + key + "' không được chứa ký tự < hoặc >");
            }
            return cleanValue;
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value;
        }
        throw new IllegalArgumentException("Giá trị '" + key + "' chỉ được là chữ, số hoặc lựa chọn đơn giản");
    }

    private List<RequiredMetadataField> requiredMetadataFields(String formCode) {
        List<RequiredMetadataField> fields = new ArrayList<>(COMMON_REQUIRED_METADATA_FIELDS);
        fields.addAll(REQUIRED_METADATA_BY_FORM_CODE.getOrDefault(
                formCode,
                REQUIRED_METADATA_BY_FORM_CODE.get("KHAC")
        ));
        return fields;
    }

    private void validateMetadataOptions(Map<String, Object> metadata) {
        requireOneOf(metadata, "gender", "Giới tính", VALID_GENDERS);
        requireOneOf(metadata, "deductionType", "Xác nhận giảm trừ gia cảnh", VALID_DEDUCTION_TYPES);
        requireOneOf(metadata, "tuitionSupportType", "Diện miễn/giảm học phí", VALID_TUITION_SUPPORT_TYPES);
        requireOneOf(metadata, "orphanStatus", "Đối tượng mồ côi", VALID_ORPHAN_STATUSES);
    }

    private void requireOneOf(Map<String, Object> metadata, String key, String label, Set<String> validValues) {
        String value = metadataText(metadata, key);
        if (!value.isBlank() && !validValues.contains(value)) {
            throw new IllegalArgumentException(label + " không hợp lệ");
        }
    }

    private void validateNumericMetadata(Map<String, Object> metadata) {
        validateIntegerRange(metadata, "graduationMonth", "Tháng ra trường dự kiến", 1, 12);
        validateIntegerRange(metadata, "graduationYear", "Năm ra trường dự kiến", 2000, 2100);
        validateIntegerRange(metadata, "studyDurationMonths", "Thời gian học tại trường", 1, 120);
        validateIntegerRange(metadata, "monthlyTuition", "Học phí hằng tháng", 1, 100_000_000);
    }

    private void validateIntegerRange(
            Map<String, Object> metadata,
            String key,
            String label,
            int min,
            int max
    ) {
        String value = metadataText(metadata, key);
        if (value.isBlank()) {
            return;
        }
        try {
            int number = Integer.parseInt(value);
            if (number < min || number > max) {
                throw new IllegalArgumentException(label + " phải từ " + min + " đến " + max);
            }
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(label + " phải là số hợp lệ");
        }
    }

    private String resolveFormCode(FormType formType) {
        String formCode = cleanText(formType.getFormCode()).toUpperCase();
        if (!formCode.isBlank()) {
            return formCode;
        }
        String name = normalizeKeyword(formType.getName());
        if (name.contains("VAY") || name.contains("VON")) {
            return "VAY_VON";
        }
        if (name.contains("NVQS") || name.contains("QUAN SU") || name.contains("NGHIA VU")) {
            return "NVQS";
        }
        return "KHAC";
    }

    private String normalizeKeyword(String value) {
        return Normalizer.normalize(cleanText(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase();
    }

    private String metadataText(Map<String, Object> metadata, String key) {
        Object value = metadata.get(key);
        return value == null ? "" : cleanText(String.valueOf(value));
    }

    private String cleanText(String value) {
        return value == null ? "" : value.trim();
    }

    private void applyBulkUpdate(ConfirmationRequest request, BulkUpdateStatusDTO dto) {
        if (dto.getStatus() != null) {
            request.setStatus(dto.getStatus());
        }
        if (dto.getAdminNote() != null) {
            request.setAdminNote(dto.getAdminNote());
        }
        if (dto.getAppointmentDate() != null) {
            request.setAppointmentDate(dto.getAppointmentDate());
        }
        if (dto.getMetadata() != null) {
            if (request.getMetadata() == null) {
                request.setMetadata(dto.getMetadata());
            } else {
                request.getMetadata().putAll(dto.getMetadata());
            }
        }
    }

    private ConfirmationRequestDTO mapToDTO(ConfirmationRequest request, boolean fetchProfile) {
        ConfirmationRequestDTO dto = new ConfirmationRequestDTO();
        dto.setId(request.getId());
        dto.setStudentId(request.getStudentId());
        dto.setFormTypeId(request.getFormType().getId());
        dto.setFormTypeName(request.getFormType().getName());
        dto.setFormCode(request.getFormType().getFormCode());
        dto.setReason(request.getReason());
        dto.setContactPhone(request.getContactPhone());
        dto.setProofFileUrl(request.getProofFileUrl());
        dto.setStatus(request.getStatus());
        dto.setAdminNote(request.getAdminNote());
        dto.setAppointmentDate(request.getAppointmentDate());
        dto.setSemester(request.getSemester());
        dto.setMetadata(request.getMetadata());
        dto.setCreatedAt(request.getCreatedAt());
        dto.setUpdatedAt(request.getUpdatedAt());

        if (fetchProfile) {
            try {
                UserProfileDTO profile = userClient.getStudentProfile("SYSTEM", "certification-service", request.getStudentId());
                dto.setStudentProfile(profile);
            } catch (Exception e) {
                log.error("Không thể lấy thông tin sinh viên từ user-service cho studentId: {}", request.getStudentId(), e);
            }
        }
        return dto;
    }

    private record RequiredMetadataField(String key, String label) {
    }
}
