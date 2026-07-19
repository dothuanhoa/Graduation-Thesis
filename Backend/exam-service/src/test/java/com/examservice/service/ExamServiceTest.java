package com.examservice.service;

import com.examservice.client.UserClient;
import com.examservice.domain.Exam;
import com.examservice.domain.ExamAttempt;
import com.examservice.domain.ExamTarget;
import com.examservice.dto.ExamRequest;
import com.examservice.dto.ExamTargetRequest;
import com.examservice.dto.RedisExamState;
import com.examservice.exception.BadRequestException;
import com.examservice.repository.ExamAttemptRepository;
import com.examservice.repository.ExamRepository;
import com.examservice.repository.QuestionOptionRepository;
import com.examservice.repository.QuestionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamServiceTest {
    @Mock private ExamRepository examRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private QuestionOptionRepository optionRepository;
    @Mock private ExamAttemptRepository attemptRepository;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private UserClient userClient;

    private ExamService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new ExamService(
                examRepository,
                questionRepository,
                optionRepository,
                attemptRepository,
                redisTemplate,
                objectMapper,
                userClient
        );
    }

    @Test
    void createPersistsNormalizedClassAndStudentTargets() {
        ExamRequest request = baseExamRequest();
        ExamTargetRequest target = new ExamTargetRequest();
        target.setTargetGroupCode("1");
        target.setTargetMode(ExamTarget.TargetMode.BOTH);
        target.setClassIds(List.of("D22_TH04"));
        target.setStudentIds(List.of("DH52201258"));
        target.setStartTime(LocalDateTime.now().plusDays(1));
        target.setEndTime(LocalDateTime.now().plusDays(2));
        request.setTargets(List.of(target));

        when(examRepository.save(any(Exam.class))).thenAnswer(invocation -> {
            Exam exam = invocation.getArgument(0);
            exam.setId(1L);
            exam.getTargets().forEach(savedTarget -> savedTarget.setId(10L));
            return exam;
        });
        when(questionRepository.countByExamId(1L)).thenReturn(0L);

        var response = service.create(request, "admin");

        assertThat(response.getTargets()).hasSize(1);
        assertThat(response.getTargets().get(0).getTargetMode()).isEqualTo(ExamTarget.TargetMode.BOTH);
        assertThat(response.getTargets().get(0).getClassIds()).containsExactly("D22_TH04");
        assertThat(response.getTargets().get(0).getStudentIds()).containsExactly("DH52201258");
    }

    @Test
    void submitRejectsWhenStudentHasUnansweredQuestions() throws Exception {
        Exam exam = new Exam();
        exam.setId(1L);
        exam.setTitle("Quy che hoc vu");
        exam.setDurationMins(30);
        exam.setQuestionCount(2);
        exam.setStatus(Exam.Status.ACTIVE);
        exam.setStartTime(LocalDateTime.now().minusMinutes(10));
        exam.setEndTime(LocalDateTime.now().plusHours(1));

        ExamAttempt attempt = new ExamAttempt();
        attempt.setId(2L);
        attempt.setExam(exam);
        attempt.setUserTsid("DH52201258");
        attempt.setStatus(ExamAttempt.Status.IN_PROGRESS);
        attempt.setStartedAt(LocalDateTime.now().minusMinutes(5));

        RedisExamState state = new RedisExamState();
        state.getQuestionIds().addAll(List.of("101", "102"));
        state.getAnswers().put("101", "1001");

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("exam_state:1:DH52201258")).thenReturn(objectMapper.writeValueAsString(state));
        when(examRepository.findById(1L)).thenReturn(Optional.of(exam));
        when(attemptRepository.findByExamIdAndUserTsid(1L, "DH52201258")).thenReturn(Optional.of(attempt));

        assertThatThrownBy(() -> service.submit(1L, "DH52201258"))
                .isInstanceOf(BadRequestException.class);

        verify(attemptRepository, never()).save(any());
    }

    private ExamRequest baseExamRequest() {
        ExamRequest request = new ExamRequest();
        request.setTitle("Quy che hoc vu");
        request.setDescription("Bai thi quy che");
        request.setStartTime(LocalDateTime.now().plusDays(1));
        request.setEndTime(LocalDateTime.now().plusDays(2));
        request.setDurationMins(30);
        request.setQuestionCount(10);
        request.setTargetGroupCode("1");
        request.setStatus(Exam.Status.INACTIVE);
        return request;
    }
}