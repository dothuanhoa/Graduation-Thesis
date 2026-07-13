package com.userservice.repository;

import com.userservice.domain.StudentGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentGroupRepository extends JpaRepository<StudentGroup, Integer> {
    Optional<StudentGroup> findByCode(String code);
    List<StudentGroup> findAllByOrderByIdAsc();
}
