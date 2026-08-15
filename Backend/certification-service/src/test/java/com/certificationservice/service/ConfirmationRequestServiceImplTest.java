package com.certificationservice.service;

import com.certificationservice.client.UserClient;
import com.certificationservice.domain.ConfirmationRequest;
import com.certificationservice.domain.FormType;
import com.certificationservice.domain.enums.RequestStatus;
import com.certificationservice.dto.BulkUpdateStatusDTO;
import com.certificationservice.dto.CreateConfirmationRequestDTO;
import com.certificationservice.dto.UpdateProofFileDTO;
import com.certificationservice.repository.ConfirmationRequestRepository;
import com.certificationservice.repository.FormTypeRepository;
import com.certificationservice.service.impl.ConfirmationRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfirmationRequestServiceImplTest {
    @Mock private ConfirmationRequestRepository requestRepository;
    @Mock private FormTypeRepository formTypeRepository;
    @Mock private UserClient userClient;

    private ConfirmationRequestServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ConfirmationRequestServiceImpl(requestRepository, formTypeRepository, userClient);
    }

    @Test
    void createRequestRejectsInactiveFormType() {
        FormType formType = formType(1L, "NVQS", false);
        CreateConfirmationRequestDTO dto = new CreateConfirmationRequestDTO();
        dto.setFormTypeId(1L);
        dto.setReason("Xin xác nhận");
        dto.setContactPhone("0912345678");
        dto.setSemester("2");
        dto.setMetadata(completeNvqsMetadata());

        when(formTypeRepository.findById(1L)).thenReturn(Optional.of(formType));

        assertThatThrownBy(() -> service.createRequest("DH52201258", dto))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createRequestRejectsMissingRequiredMetadata() {
        FormType formType = formType(1L, "NVQS", true);
        CreateConfirmationRequestDTO dto = new CreateConfirmationRequestDTO();
        dto.setFormTypeId(1L);
        dto.setReason("Xin xác nhận");
        dto.setContactPhone("0912345678");
        dto.setSemester("2");
        dto.setMetadata(Map.of("fullName", "Nguyễn Văn A"));

        when(formTypeRepository.findById(1L)).thenReturn(Optional.of(formType));

        assertThatThrownBy(() -> service.createRequest("DH52201258", dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Vui lòng nhập đầy đủ thông tin trên đơn");
    }

    @Test
    void createRequestSavesNormalizedMetadataWhenAllRequiredFieldsArePresent() {
        FormType formType = formType(1L, "NVQS", true);
        CreateConfirmationRequestDTO dto = new CreateConfirmationRequestDTO();
        dto.setFormTypeId(1L);
        dto.setReason(" Xin xác nhận ");
        dto.setContactPhone(" 0912345678 ");
        dto.setSemester(" 2 ");
        dto.setMetadata(completeNvqsMetadata());

        when(formTypeRepository.findById(1L)).thenReturn(Optional.of(formType));
        when(requestRepository.existsByStudentIdAndFormTypeIdAndSemesterAndStatusNot(
                "DH52201258", 1L, "2", RequestStatus.CANCELLED
        )).thenReturn(false);
        when(requestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.createRequest("DH52201258", dto);

        assertThat(result.getReason()).isEqualTo("Xin xác nhận");
        assertThat(result.getContactPhone()).isEqualTo("0912345678");
        assertThat(result.getSemester()).isEqualTo("2");
        assertThat(result.getMetadata()).containsEntry("formCode", "NVQS");
    }

    @Test
    void updateProofFileOnlyAllowedWhenRequestNeedsInfo() {
        ConfirmationRequest request = confirmationRequest(10L, RequestStatus.PENDING);
        UpdateProofFileDTO dto = new UpdateProofFileDTO();
        dto.setProofFileUrl("/certification/2025-2026/proof.png");
        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> service.updateProofFile(10L, "DH52201258", dto))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void bulkUpdateStatusAndAppointmentDate() {
        ConfirmationRequest first = confirmationRequest(1L, RequestStatus.PENDING);
        ConfirmationRequest second = confirmationRequest(2L, RequestStatus.PROCESSING);
        BulkUpdateStatusDTO dto = new BulkUpdateStatusDTO();
        dto.setRequestIds(List.of(1L, 2L));
        dto.setStatus(RequestStatus.COMPLETED);
        dto.setAppointmentDate(LocalDate.of(2026, 7, 20));

        when(requestRepository.findAllById(any())).thenReturn(List.of(first, second));
        when(requestRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.updateRequestStatuses(dto);

        assertThat(result).hasSize(2);
        assertThat(first.getStatus()).isEqualTo(RequestStatus.COMPLETED);
        assertThat(second.getAppointmentDate()).isEqualTo(LocalDate.of(2026, 7, 20));
    }

    private ConfirmationRequest confirmationRequest(Long id, RequestStatus status) {
        ConfirmationRequest request = new ConfirmationRequest();
        request.setId(id);
        request.setStudentId("DH52201258");
        request.setFormType(formType(1L, "NVQS", true));
        request.setStatus(status);
        return request;
    }

    private FormType formType(Long id, String code, boolean active) {
        FormType formType = new FormType();
        formType.setId(id);
        formType.setName(code);
        formType.setFormCode(code);
        formType.setIsActive(active);
        return formType;
    }

    private Map<String, Object> completeNvqsMetadata() {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("fullName", "Nguyễn Văn A");
        metadata.put("studentId", "DH52201258");
        metadata.put("dob", "2004-01-02");
        metadata.put("gender", "Nam");
        metadata.put("contactPhone", "0912345678");
        metadata.put("classCode", "D22_TH01");
        metadata.put("facultyName", "Công nghệ thông tin");
        metadata.put("educationLevel", "Đại học");
        metadata.put("trainingType", "Chính quy");
        metadata.put("requestDate", "2026-08-14");
        metadata.put("permanentAddress", "TP. Hồ Chí Minh");
        metadata.put("academicYear", "2022-2026");
        metadata.put("requestSchoolYear", "2025-2026");
        metadata.put("reason", "Xin xác nhận");
        return metadata;
    }
}
