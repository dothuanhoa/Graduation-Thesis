package com.userservice.repository;

import com.userservice.domain.Faculty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    List<Faculty> findAllByOrderByFacultyCodeAsc();
    Optional<Faculty> findByFacultyCodeIgnoreCase(String facultyCode);
    boolean existsByFacultyCodeIgnoreCase(String facultyCode);
    boolean existsByFacultyCodeIgnoreCaseAndIdNot(String facultyCode, Long id);
}
