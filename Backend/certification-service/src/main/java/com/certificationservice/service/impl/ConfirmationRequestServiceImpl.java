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

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfirmationRequestServiceImpl implements ConfirmationRequestService {

    private final ConfirmationRequestRepository requestRepository;
    private final FormTypeRepository formTypeRepository;
    private final UserClient userClient;

    @Override
    @Transactional
    public ConfirmationRequestDTO createRequest(String studentId, CreateConfirmationRequestDTO dto) {
        FormType formType = formTypeRepository.findById(dto.getFormTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại form này"));
        
        if (!formType.getIsActive()) {
            throw new IllegalArgumentException("Loại form này hiện không hoạt động");
        }

        if (dto.getSemester() != null && !dto.getSemester().isEmpty()) {
            boolean exists = requestRepository.existsByStudentIdAndFormTypeIdAndSemesterAndStatusNot(
                    studentId, dto.getFormTypeId(), dto.getSemester(), RequestStatus.CANCELLED);
            if (exists) {
                throw new IllegalArgumentException("Bạn đã gửi yêu cầu này trong học kỳ " + dto.getSemester() + " rồi");
            }
        }

        ConfirmationRequest request = new ConfirmationRequest();
        request.setStudentId(studentId);
        request.setFormType(formType);
        request.setReason(dto.getReason());
        request.setContactPhone(dto.getContactPhone());
        request.setProofFileUrl(dto.getProofFileUrl());
        request.setSemester(dto.getSemester());
        if (dto.getMetadata() != null) {
            request.setMetadata(dto.getMetadata());
        }
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
                UserProfileDTO profile = userClient.getStudentProfile(request.getStudentId());
                dto.setStudentProfile(profile);
            } catch (Exception e) {
                log.error("Không thể lấy thông tin sinh viên từ user-service cho studentId: {}", request.getStudentId(), e);
            }
        }
        return dto;
    }
}
