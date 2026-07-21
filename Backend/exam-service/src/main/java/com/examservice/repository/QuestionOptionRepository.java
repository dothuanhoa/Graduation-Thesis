package com.examservice.repository;

import com.examservice.domain.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {
    List<QuestionOption> findByQuestionIdIn(Collection<Long> questionIds);
}
