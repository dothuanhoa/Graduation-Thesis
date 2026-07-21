package com.userservice.repository;

import com.userservice.domain.AcademicYear;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AcademicYearRepository extends JpaRepository<AcademicYear, Long> {
    List<AcademicYear> findAllByOrderByYearNameAsc();
    Optional<AcademicYear> findByYearNameIgnoreCase(String yearName);
    boolean existsByYearNameIgnoreCase(String yearName);
    boolean existsByYearNameIgnoreCaseAndIdNot(String yearName, Long id);
}
