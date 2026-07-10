package com.userservice.repository;

import com.userservice.domain.Clazz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassRepository extends JpaRepository<Clazz, Long> {
    List<Clazz> findAllByOrderByClassCodeAsc();
    Optional<Clazz> findByClassCodeIgnoreCase(String classCode);
    boolean existsByClassCodeIgnoreCase(String classCode);
    boolean existsByClassCodeIgnoreCaseAndIdNot(String classCode, Long id);
    long countByFacultyId(Long facultyId);
    long countByAcademicYearId(Long academicYearId);
}
