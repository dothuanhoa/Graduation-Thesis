package com.examservice.repository;

import com.examservice.domain.ExamAttempt;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    @EntityGraph(attributePaths = "exam")
    Optional<ExamAttempt> findByExamIdAndUserTsid(Long examId, String userTsid);

    @EntityGraph(attributePaths = "exam")
    List<ExamAttempt> findByUserTsidOrderByCreatedAtDesc(String userTsid);

    @EntityGraph(attributePaths = "exam")
    List<ExamAttempt> findByExamIdOrderByCreatedAtDesc(Long examId);

    @EntityGraph(attributePaths = "exam")
    List<ExamAttempt> findAllByOrderByCreatedAtDesc();

    long countByExamId(Long examId);
}
