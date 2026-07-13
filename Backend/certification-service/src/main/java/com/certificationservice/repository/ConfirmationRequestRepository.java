package com.certificationservice.repository;

import com.certificationservice.domain.ConfirmationRequest;
import com.certificationservice.domain.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConfirmationRequestRepository extends JpaRepository<ConfirmationRequest, Long> {
    
    List<ConfirmationRequest> findByStudentIdOrderByCreatedAtDesc(String studentId);
    
    boolean existsByStudentIdAndFormTypeIdAndSemesterAndStatusNot(String studentId, Long formTypeId, String semester, RequestStatus status);
    
    Page<ConfirmationRequest> findByStudentId(String studentId, Pageable pageable);
}
