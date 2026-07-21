package com.examservice.repository;

import com.examservice.domain.Question;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    @EntityGraph(attributePaths = "options")
    List<Question> findByExamIdOrderByCreatedAtAsc(Long examId);

    @EntityGraph(attributePaths = "options")
    @Query("select q from Question q where q.id = :id")
    Optional<Question> findWithOptionsById(@Param("id") Long id);

    long countByExamId(Long examId);
}
