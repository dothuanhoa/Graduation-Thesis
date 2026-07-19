package com.examservice.repository;

import com.examservice.domain.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    @Query("select distinct e from Exam e left join fetch e.targets order by e.createdAt desc")
    List<Exam> findAllByOrderByCreatedAtDesc();

    @Query("select distinct e from Exam e left join fetch e.targets where e.status = :status order by e.startTime desc")
    List<Exam> findByStatusOrderByStartTimeDesc(@Param("status") Exam.Status status);

    @Override
    @Query("select distinct e from Exam e left join fetch e.targets where e.id = :id")
    Optional<Exam> findById(@Param("id") Long id);
}
