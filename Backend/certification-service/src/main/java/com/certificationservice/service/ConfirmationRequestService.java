package com.certificationservice.service;

import com.certificationservice.dto.ConfirmationRequestDTO;
import com.certificationservice.dto.CreateConfirmationRequestDTO;
import com.certificationservice.dto.UpdateStatusDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ConfirmationRequestService {
    
    ConfirmationRequestDTO createRequest(String studentId, CreateConfirmationRequestDTO dto);
    
    List<ConfirmationRequestDTO> getMyRequests(String studentId);
    
    ConfirmationRequestDTO getRequestDetail(Long id);
    
    void cancelRequest(Long id, String studentId);
    
    ConfirmationRequestDTO updateRequestStatus(Long id, UpdateStatusDTO dto);
    
    Page<ConfirmationRequestDTO> getAllRequests(Pageable pageable);
}
