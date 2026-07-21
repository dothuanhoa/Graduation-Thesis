package com.userservice.repository;

import com.userservice.domain.UserProfile;
import com.userservice.domain.StudentGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    List<UserProfile> findAllByOrderByStudentIdAsc();
    Optional<UserProfile> findByStudentId(String studentId);
    List<UserProfile> findByStudentIdIn(Collection<String> studentIds);
    List<UserProfile> findByClazzIdOrderByStudentIdAsc(Long clazzId);
    List<UserProfile> findByClazzAcademicYearIdOrderByStudentIdAsc(Long academicYearId);
    long countByClazzId(Long clazzId);
    long countByClazzFacultyId(Long facultyId);
    boolean existsByClazzId(Long clazzId);

    @Modifying
    @Query("update UserProfile user set user.studentGroup = :studentGroup where user.studentGroup is null")
    int assignDefaultStudentGroup(@Param("studentGroup") StudentGroup studentGroup);
}
