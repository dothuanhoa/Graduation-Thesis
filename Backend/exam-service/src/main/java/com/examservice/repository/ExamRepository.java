package com.examservice.repository;

import com.examservice.domain.Exam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findAllByOrderByCreatedAtDesc();

    List<Exam> findByStatusOrderByStartTimeDesc(Exam.Status status);
}
