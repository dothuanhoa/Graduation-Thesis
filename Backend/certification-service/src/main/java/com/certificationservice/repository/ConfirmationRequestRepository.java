package com.certificationservice.repository;

import com.certificationservice.domain.ConfirmationRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConfirmationRequestRepository extends JpaRepository<ConfirmationRequest, Long> {
    
    List<ConfirmationRequest> findByStudentIdOrderByCreatedAtDesc(String studentId);
    
    boolean existsByStudentIdAndFormTypeIdAndSemester(String studentId, Long formTypeId, String semester);
    
    Page<ConfirmationRequest> findByStudentId(String studentId, Pageable pageable);
}
