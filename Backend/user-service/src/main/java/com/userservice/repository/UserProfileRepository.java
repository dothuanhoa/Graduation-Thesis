package com.userservice.repository;

import com.userservice.domain.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByStudentId(String studentId);
    List<UserProfile> findByStudentIdIn(Collection<String> studentIds);
    long countByClazzId(Long clazzId);
    long countByClazzFacultyId(Long facultyId);
    boolean existsByClazzId(Long clazzId);
}
