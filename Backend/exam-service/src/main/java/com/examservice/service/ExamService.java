package com.examservice.service;

import com.examservice.client.UserClient;
import com.examservice.domain.Exam;
import com.examservice.domain.ExamAttempt;
import com.examservice.domain.ExamTarget;
import com.examservice.domain.ExamTargetClass;
import com.examservice.domain.ExamTargetStudent;
import com.examservice.domain.Question;
import com.examservice.domain.QuestionOption;
import com.examservice.dto.*;
import com.examservice.exception.BadRequestException;
import com.examservice.exception.ResourceNotFoundException;
import com.examservice.repository.ExamAttemptRepository;
import com.examservice.repository.ExamRepository;
import com.examservice.repository.QuestionOptionRepository;
import com.examservice.repository.QuestionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamService {
    private static final int EXAM_BUFFER_MINUTES = 15;
    private static final int MAX_VIOLATIONS = 3;
    private static final int MAX_IMPORT_ERRORS = 20;
    private static final String INTERNAL_ROLE = "SYSTEM";
    private static final String INTERNAL_USER_CODE = "exam-service";
    private static final Map<String, String> STUDENT_GROUP_NAMES = Map.of(
            "1", "Đầu khóa",
            "2", "Giữa khóa",
            "3", "Cuối khóa"
    );

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final ExamAttemptRepository attemptRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final UserClient userClient;

    @Transactional(readOnly = true)
    public List<ExamResponse> findAll() {
        return examRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toExamResponse).toList();
    }

    @Transactional(readOnly = true)
    public ExamResponse findById(Long id) {
        return toExamResponse(getExam(id));
    }

    @Transactional
    public ExamResponse create(ExamRequest request, String createdBy) {
        validateExamRequest(request);
        Exam exam = new Exam();
        applyExamRequest(exam, request);
        exam.setCreatedBy(createdBy);
        return toExamResponse(examRepository.save(exam));
    }

    @Transactional
    public ExamResponse update(Long id, ExamRequest request) {
        validateExamRequest(request);
        Exam exam = getExam(id);
        if (attemptRepository.countByExamId(id) > 0 && !Objects.equals(exam.getDurationMins(), request.getDurationMins())) {
            throw new BadRequestException("Kỳ thi đã có lượt làm bài nên không được đổi thời lượng");
        }
        applyExamRequest(exam, request, true);
        return toExamResponse(examRepository.saveAndFlush(exam));
    }

    @Transactional
    public ExamResponse updateStatus(Long id, Exam.Status status) {
        Exam exam = getExam(id);
        if (status == Exam.Status.ACTIVE) {
            long questionCount = questionRepository.countByExamId(id);
            if (questionCount < exam.getQuestionCount()) {
                throw new BadRequestException("Ngân hàng câu hỏi chưa đủ số lượng để mở kỳ thi");
            }
        }
        exam.setStatus(status);
        return toExamResponse(examRepository.save(exam));
    }

    @Transactional
    public void delete(Long id) {
        Exam exam = getExam(id);
        if (attemptRepository.countByExamId(id) > 0 || questionRepository.countByExamId(id) > 0) {
            exam.setStatus(Exam.Status.INACTIVE);
            examRepository.save(exam);
            return;
        }
        examRepository.delete(exam);
    }

    public List<QuestionResponse> listQuestions(Long examId) {
        getExam(examId);
        return questionRepository.findByExamIdOrderByCreatedAtAsc(examId).stream()
                .map(question -> toQuestionResponse(question, true))
                .toList();
    }

    @Transactional
    public QuestionResponse createQuestion(Long examId, QuestionRequest request) {
        Exam exam = getExam(examId);
        validateQuestionRequest(request);

        Question question = new Question();
        question.setExam(exam);
        applyQuestionRequest(question, request);
        return toQuestionResponse(questionRepository.save(question), true);
    }

    @Transactional
    public QuestionResponse updateQuestion(Long examId, Long questionId, QuestionRequest request) {
        validateQuestionRequest(request);
        Question question = getQuestion(questionId);
        requireQuestionBelongsToExam(question, examId);

        question.getOptions().clear();
        applyQuestionRequest(question, request);
        return toQuestionResponse(questionRepository.save(question), true);
    }

    @Transactional
    public void deleteQuestion(Long examId, Long questionId) {
        Question question = getQuestion(questionId);
        requireQuestionBelongsToExam(question, examId);
        questionRepository.delete(question);
    }

    @Transactional
    public QuestionImportResult importQuestions(Long examId, MultipartFile file) {
        Exam exam = getExam(examId);
        int imported = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream(); Workbook workbook = WorkbookFactory.create(inputStream)) {
            DataFormatter formatter = new DataFormatter(Locale.forLanguageTag("vi-VN"));
            Sheet sheet = findQuestionSheet(workbook, formatter);
            int headerRowNumber = findQuestionHeaderRowNumber(sheet, formatter);
            int startRow = headerRowNumber >= 0 ? headerRowNumber + 1 : sheet.getFirstRowNum();

            for (int rowIndex = startRow; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                int rowNumber = rowIndex + 1;
                if (row == null || isEmptyQuestionRow(row, formatter)) {
                    continue;
                }

                if (headerRowNumber < 0 && looksLikeHeader(row, formatter)) {
                    continue;
                }

                String content = readString(row, 0, formatter);
                String optionA = readString(row, 1, formatter);
                String optionB = readString(row, 2, formatter);
                String optionC = readString(row, 3, formatter);
                String optionD = readString(row, 4, formatter);
                String correct = readString(row, 5, formatter).toUpperCase(Locale.ROOT);

                if (content.isBlank() || optionA.isBlank() || optionB.isBlank() || correct.isBlank()) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": Thiếu câu hỏi, đáp án A/B hoặc đáp án đúng");
                    continue;
                }

                List<String> options = new ArrayList<>(List.of(optionA, optionB));
                if (!optionC.isBlank()) options.add(optionC);
                if (!optionD.isBlank()) options.add(optionD);

                int correctIndex = "ABCD".indexOf(correct);
                if (correctIndex < 0 || correctIndex >= options.size()) {
                    skipped++;
                    errors.add("Dòng " + rowNumber + ": Đáp án đúng phải là A, B, C hoặc D và có nội dung tương ứng");
                    continue;
                }

                Question question = new Question();
                question.setExam(exam);
                question.setContent(content);
                for (int index = 0; index < options.size(); index++) {
                    QuestionOption option = new QuestionOption();
                    option.setQuestion(question);
                    option.setContent(options.get(index));
                    option.setCorrect(index == correctIndex);
                    question.getOptions().add(option);
                }
                questionRepository.save(question);
                imported++;
            }
        } catch (Exception ex) {
            throw new BadRequestException("Không đọc được file Excel câu hỏi: " + ex.getMessage());
        }

        if (imported == 0) {
            String detail = errors.isEmpty()
                    ? "Không tìm thấy dòng câu hỏi hợp lệ. File cần có cột: Câu hỏi | A | B | C | D | Đáp án đúng."
                    : String.join("; ", errors);
            throw new BadRequestException("Không import được câu hỏi nào. " + detail);
        }

        return QuestionImportResult.builder().imported(imported).skipped(skipped).errors(errors).build();
    }

    public List<AttemptResponse> listAttempts(Long examId) {
        if (examId != null) {
            getExam(examId);
            return attemptRepository.findByExamIdOrderByCreatedAtDesc(examId).stream().map(this::toAttemptResponse).toList();
        }
        return attemptRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toAttemptResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<StudentExamSummary> listForStudent(String userCode) {
        UserProfileDTO profile = resolveStudentProfile(userCode);
        Map<Long, ExamAttempt> attempts = attemptRepository.findByUserTsidOrderByCreatedAtDesc(userCode).stream()
                .collect(Collectors.toMap(attempt -> attempt.getExam().getId(), Function.identity(), (first, second) -> first));

        return examRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(exam -> {
                    ExamTarget matchedTarget = findMatchingTarget(exam, profile).orElse(null);
                    ExamAttempt attempt = attempts.get(exam.getId());
                    if (matchedTarget == null && attempt == null) {
                        return null;
                    }
                    if (exam.getStatus() != Exam.Status.ACTIVE && attempt == null) {
                        return null;
                    }
                    return toStudentSummary(exam, matchedTarget == null ? primaryTarget(exam) : matchedTarget, attempt);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional
    public ExamStateResponse startExam(Long examId, String userCode, String remoteAddress) {
        Exam exam = getExam(examId);
        UserProfileDTO profile = resolveStudentProfile(userCode);
        ExamTarget target = findMatchingTarget(exam, profile)
                .orElseThrow(() -> new BadRequestException("Kỳ thi này không thuộc đối tượng thi của bạn."));
        validateExamOpen(exam, target);

        ExamAttempt attempt = attemptRepository.findByExamIdAndUserTsid(examId, userCode).orElse(null);
        if (attempt != null && attempt.getStatus() == ExamAttempt.Status.SUBMITTED) {
            throw new BadRequestException("Bạn đã nộp bài kỳ thi này");
        }
        if (attempt != null && attempt.getStatus() == ExamAttempt.Status.LOCKED) {
            throw new BadRequestException("Bài thi đã bị khóa: " + attempt.getLockedReason());
        }

        enforceSingleSession(exam, userCode, remoteAddress, attempt);

        if (attempt == null) {
            attempt = new ExamAttempt();
            attempt.setExam(exam);
            attempt.setUserTsid(userCode);
            attempt.setStatus(ExamAttempt.Status.IN_PROGRESS);
            attempt.setStartedAt(LocalDateTime.now());
            attempt = attemptRepository.save(attempt);
        } else if (attempt.getStatus() == ExamAttempt.Status.NOT_STARTED) {
            attempt.setStatus(ExamAttempt.Status.IN_PROGRESS);
            attempt.setStartedAt(LocalDateTime.now());
            attempt = attemptRepository.save(attempt);
        }

        ExamAttempt activeAttempt = attempt;
        RedisExamState state = readState(examId, userCode).orElseGet(() -> createNewState(exam, activeAttempt));
        writeState(exam, userCode, state);
        return toExamStateResponse(exam, attempt, state);
    }

    public ExamStateResponse getState(Long examId, String userCode) {
        Exam exam = getExam(examId);
        ExamAttempt attempt = getAttempt(examId, userCode);
        if (attempt.getStatus() == ExamAttempt.Status.SUBMITTED || attempt.getStatus() == ExamAttempt.Status.LOCKED) {
            return toExamStateResponse(exam, attempt, readState(examId, userCode).orElse(new RedisExamState()));
        }
        RedisExamState state = readState(examId, userCode).orElseThrow(() -> new BadRequestException("Không tìm thấy tiến độ làm bài. Vui lòng vào lại bài thi."));
        if (remainingSeconds(exam, attempt) <= 0) {
            return submit(examId, userCode);
        }
        return toExamStateResponse(exam, attempt, state);
    }

    public ExamStateResponse saveAnswer(Long examId, String userCode, AnswerSaveRequest request) {
        Exam exam = getExam(examId);
        ExamAttempt attempt = getAttempt(examId, userCode);
        requireInProgress(attempt);
        if (remainingSeconds(exam, attempt) <= 0) {
            return submit(examId, userCode);
        }

        RedisExamState state = readState(examId, userCode).orElseThrow(() -> new BadRequestException("Không tìm thấy tiến độ làm bài"));
        if (!state.getQuestionIds().contains(request.getQuestionId())) {
            throw new BadRequestException("Câu hỏi không thuộc đề thi hiện tại");
        }
        List<String> optionIds = state.getOptionOrderByQuestion().getOrDefault(request.getQuestionId(), List.of());
        if (!optionIds.contains(request.getOptionId())) {
            throw new BadRequestException("Đáp án không thuộc câu hỏi hiện tại");
        }
        state.getAnswers().put(request.getQuestionId(), request.getOptionId());
        writeState(exam, userCode, state);
        return toExamStateResponse(exam, attempt, state);
    }

    @Transactional
    public ExamStateResponse recordViolation(Long examId, String userCode) {
        Exam exam = getExam(examId);
        ExamAttempt attempt = getAttempt(examId, userCode);
        requireInProgress(attempt);
        attempt.setViolationCount(attempt.getViolationCount() + 1);
        attemptRepository.save(attempt);
        if (attempt.getViolationCount() >= MAX_VIOLATIONS) {
            return submitWithReason(exam, attempt, "Tự động nộp bài do vượt quá số lần rời màn hình");
        }
        RedisExamState state = readState(examId, userCode).orElse(new RedisExamState());
        return toExamStateResponse(exam, attempt, state);
    }

    @Transactional
    public ExamStateResponse submit(Long examId, String userCode) {
        Exam exam = getExam(examId);
        ExamAttempt attempt = getAttempt(examId, userCode);
        if (attempt.getStatus() == ExamAttempt.Status.SUBMITTED || attempt.getStatus() == ExamAttempt.Status.LOCKED) {
            return toExamStateResponse(exam, attempt, new RedisExamState());
        }
        requireAllQuestionsAnswered(exam, attempt);
        return submitWithReason(exam, attempt, null);
    }

    public AttemptResponse getResult(Long examId, String userCode) {
        return toAttemptResponse(getAttempt(examId, userCode));
    }

    private void requireAllQuestionsAnswered(Exam exam, ExamAttempt attempt) {
        RedisExamState state = readState(exam.getId(), attempt.getUserTsid())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tiến độ làm bài. Vui lòng vào lại bài thi."));

        long unansweredCount = state.getQuestionIds().stream()
                .filter(questionId -> !state.getAnswers().containsKey(questionId)
                        || state.getAnswers().get(questionId) == null
                        || state.getAnswers().get(questionId).isBlank())
                .count();

        if (unansweredCount > 0) {
            throw new BadRequestException("Vui lòng trả lời đầy đủ câu hỏi trước khi nộp bài. Còn thiếu " + unansweredCount + " câu.");
        }
    }
    private ExamStateResponse submitWithReason(Exam exam, ExamAttempt attempt, String reason) {
        RedisExamState state = readState(exam.getId(), attempt.getUserTsid()).orElse(new RedisExamState());
        gradeAttempt(attempt, state);
        attempt.setStatus(ExamAttempt.Status.SUBMITTED);
        attempt.setSubmittedAt(LocalDateTime.now());
        if (reason != null) {
            attempt.setLockedReason(reason);
        }
        attemptRepository.save(attempt);
        redisTemplate.delete(stateKey(exam.getId(), attempt.getUserTsid()));
        redisTemplate.delete(sessionKey(exam.getId(), attempt.getUserTsid()));
        return toExamStateResponse(exam, attempt, state);
    }

    private void gradeAttempt(ExamAttempt attempt, RedisExamState state) {
        List<Long> questionIds = parseIds(state.getQuestionIds());
        if (questionIds.isEmpty()) {
            attempt.setCorrectCount(0);
            attempt.setTotalQuestions(0);
            attempt.setScore(0.0);
            return;
        }

        Map<Long, QuestionOption> correctOptions = optionRepository.findByQuestionIdIn(questionIds).stream()
                .filter(QuestionOption::isCorrect)
                .collect(Collectors.toMap(option -> option.getQuestion().getId(), Function.identity()));

        int correct = 0;
        for (Map.Entry<String, String> answer : state.getAnswers().entrySet()) {
            Long questionId = parseLong(answer.getKey(), "Mã câu hỏi không hợp lệ");
            Long optionId = parseLong(answer.getValue(), "Mã đáp án không hợp lệ");
            QuestionOption correctOption = correctOptions.get(questionId);
            if (correctOption != null && correctOption.getId().equals(optionId)) {
                correct++;
            }
        }
        int total = questionIds.size();
        attempt.setCorrectCount(correct);
        attempt.setTotalQuestions(total);
        attempt.setScore(total == 0 ? 0.0 : Math.round((correct * 10.0 / total) * 100.0) / 100.0);
    }

    private RedisExamState createNewState(Exam exam, ExamAttempt attempt) {
        List<Question> allQuestions = questionRepository.findByExamIdOrderByCreatedAtAsc(exam.getId());
        if (allQuestions.size() < exam.getQuestionCount()) {
            throw new BadRequestException("Ngân hàng câu hỏi chưa đủ số lượng để sinh đề");
        }

        List<Question> selected = new ArrayList<>(allQuestions);
        Collections.shuffle(selected);
        selected = selected.subList(0, exam.getQuestionCount());

        RedisExamState state = new RedisExamState();
        state.setStartedAt(attempt.getStartedAt().toString());
        for (Question question : selected) {
            state.getQuestionIds().add(String.valueOf(question.getId()));
            List<QuestionOption> options = new ArrayList<>(question.getOptions());
            Collections.shuffle(options);
            state.getOptionOrderByQuestion().put(
                    String.valueOf(question.getId()),
                    options.stream().map(option -> String.valueOf(option.getId())).toList()
            );
        }
        return state;
    }

    private ExamStateResponse toExamStateResponse(Exam exam, ExamAttempt attempt, RedisExamState state) {
        List<StudentQuestionResponse> questions = buildStudentQuestions(state);
        return ExamStateResponse.builder()
                .examId(String.valueOf(exam.getId()))
                .attemptId(attempt.getId() == null ? null : String.valueOf(attempt.getId()))
                .status(attempt.getStatus())
                .startedAt(attempt.getStartedAt())
                .durationMins(exam.getDurationMins())
                .remainingSeconds(Math.max(0, remainingSeconds(exam, attempt)))
                .violationCount(attempt.getViolationCount())
                .answers(state.getAnswers())
                .questions(questions)
                .build();
    }

    private List<StudentQuestionResponse> buildStudentQuestions(RedisExamState state) {
        List<Long> questionIds = parseIds(state.getQuestionIds());
        if (questionIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Question> questionMap = questionRepository.findAllById(questionIds).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        Map<Long, QuestionOption> optionMap = optionRepository.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.toMap(QuestionOption::getId, Function.identity()));

        List<StudentQuestionResponse> responses = new ArrayList<>();
        for (String questionIdText : state.getQuestionIds()) {
            Long questionId = parseLong(questionIdText, "Mã câu hỏi không hợp lệ");
            Question question = questionMap.get(questionId);
            if (question == null) continue;

            List<StudentOptionResponse> options = state.getOptionOrderByQuestion().getOrDefault(questionIdText, List.of()).stream()
                    .map(optionIdText -> optionMap.get(parseLong(optionIdText, "Mã đáp án không hợp lệ")))
                    .filter(Objects::nonNull)
                    .map(option -> StudentOptionResponse.builder()
                            .id(String.valueOf(option.getId()))
                            .content(option.getContent())
                            .build())
                    .toList();

            responses.add(StudentQuestionResponse.builder()
                    .id(String.valueOf(question.getId()))
                    .content(question.getContent())
                    .options(options)
                    .build());
        }
        return responses;
    }

    private Optional<RedisExamState> readState(Long examId, String userCode) {
        String value = redisTemplate.opsForValue().get(stateKey(examId, userCode));
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(value, RedisExamState.class));
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Không đọc được tiến độ làm bài từ Redis");
        }
    }

    private void writeState(Exam exam, String userCode, RedisExamState state) {
        try {
            redisTemplate.opsForValue().set(
                    stateKey(exam.getId(), userCode),
                    objectMapper.writeValueAsString(state),
                    Duration.ofMinutes(exam.getDurationMins() + EXAM_BUFFER_MINUTES)
            );
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Không lưu được tiến độ làm bài vào Redis");
        }
    }

    private void enforceSingleSession(Exam exam, String userCode, String remoteAddress, ExamAttempt attempt) {
        String key = sessionKey(exam.getId(), userCode);
        String current = redisTemplate.opsForValue().get(key);
        if (current != null && !current.equals(remoteAddress)) {
            if (attempt != null && attempt.getStatus() == ExamAttempt.Status.IN_PROGRESS) {
                attempt.setStatus(ExamAttempt.Status.LOCKED);
                attempt.setLockedReason("Phát hiện tài khoản mở bài thi ở phiên/IP khác");
                attempt.setSubmittedAt(LocalDateTime.now());
                attemptRepository.save(attempt);
                redisTemplate.delete(stateKey(exam.getId(), userCode));
            }
            throw new BadRequestException("Bài thi đã bị khóa do phát hiện phiên đăng nhập khác");
        }
        redisTemplate.opsForValue().set(key, remoteAddress, Duration.ofMinutes(exam.getDurationMins() + EXAM_BUFFER_MINUTES));
    }

    private long remainingSeconds(Exam exam, ExamAttempt attempt) {
        if (attempt.getStartedAt() == null) {
            return exam.getDurationMins() * 60L;
        }
        LocalDateTime deadline = attempt.getStartedAt().plusMinutes(exam.getDurationMins());
        return Duration.between(LocalDateTime.now(), deadline).toSeconds();
    }

    private String stateKey(Long examId, String userCode) {
        return "exam_state:" + examId + ":" + userCode;
    }

    private String sessionKey(Long examId, String userCode) {
        return "exam_session:" + examId + ":" + userCode;
    }

    private void applyExamRequest(Exam exam, ExamRequest request) {
        applyExamRequest(exam, request, false);
    }

    private void applyExamRequest(Exam exam, ExamRequest request, boolean flushExistingTargets) {
        exam.setTitle(request.getTitle().trim());
        exam.setDescription(blankToNull(request.getDescription()));
        exam.setDurationMins(request.getDurationMins());
        exam.setQuestionCount(request.getQuestionCount());
        exam.setStatus(request.getStatus() == null ? Exam.Status.INACTIVE : request.getStatus());

        List<ExamTargetRequest> targetRequests = normalizedTargetRequests(request);
        LocalDateTime firstStart = targetRequests.stream()
                .map(ExamTargetRequest::getStartTime)
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(request.getStartTime());
        LocalDateTime lastEnd = targetRequests.stream()
                .map(ExamTargetRequest::getEndTime)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(request.getEndTime());
        String primaryGroupCode = targetRequests.isEmpty()
                ? normalizeGroupCode(request.getTargetGroupCode())
                : normalizeGroupCode(targetRequests.get(0).getTargetGroupCode());

        exam.setStartTime(firstStart);
        exam.setEndTime(lastEnd);
        exam.setTargetGroupCode(primaryGroupCode.isBlank() ? "1" : primaryGroupCode);

        exam.getTargets().clear();
        if (flushExistingTargets) {
            examRepository.flush();
        }
        for (ExamTargetRequest targetRequest : targetRequests) {
            ExamTarget target = new ExamTarget();
            target.setExam(exam);
            target.setStudentGroupCode(normalizeGroupCode(targetRequest.getTargetGroupCode()));
            target.setFacultyId(blankToNull(targetRequest.getFacultyId()));
            target.setFacultyCode(blankToNull(targetRequest.getFacultyCode()));
            target.setFacultyName(blankToNull(targetRequest.getFacultyName()));
            target.setTargetMode(targetRequest.getTargetMode() == null ? ExamTarget.TargetMode.CLASS : targetRequest.getTargetMode());
            target.setStartTime(targetRequest.getStartTime());
            target.setEndTime(targetRequest.getEndTime());
            addTargetClasses(target, preferredIdentifiers(targetRequest.getClassIds(), targetRequest.getClassCodes()));
            addTargetStudents(target, preferredIdentifiers(targetRequest.getStudentIds(), targetRequest.getStudentCodes()));
            exam.getTargets().add(target);
        }
    }

    private void applyQuestionRequest(Question question, QuestionRequest request) {
        question.setContent(request.getContent().trim());
        for (OptionRequest optionRequest : request.getOptions()) {
            QuestionOption option = new QuestionOption();
            option.setQuestion(question);
            option.setContent(optionRequest.getContent().trim());
            option.setCorrect(optionRequest.isCorrect());
            question.getOptions().add(option);
        }
    }

    private void validateExamRequest(ExamRequest request) {
        List<ExamTargetRequest> targetRequests = normalizedTargetRequests(request);
        if (targetRequests.isEmpty()) {
            if (!request.getStartTime().isBefore(request.getEndTime())) {
                throw new BadRequestException("Thời gian mở đề phải trước thời gian đóng đề");
            }
            if (!STUDENT_GROUP_NAMES.containsKey(normalizeGroupCode(request.getTargetGroupCode()))) {
                throw new BadRequestException("Đối tượng thi không hợp lệ. Chỉ hỗ trợ Đầu khóa, Giữa khóa hoặc Cuối khóa.");
            }
            return;
        }

        Set<String> usedClassKeys = new LinkedHashSet<>();
        Set<String> usedStudentKeys = new LinkedHashSet<>();
        for (int index = 0; index < targetRequests.size(); index++) {
            ExamTargetRequest target = targetRequests.get(index);
            String groupCode = normalizeGroupCode(target.getTargetGroupCode());
            if (!STUDENT_GROUP_NAMES.containsKey(groupCode)) {
                throw new BadRequestException("Đối tượng thi ở dòng " + (index + 1) + " không hợp lệ.");
            }
            if (target.getStartTime() == null || target.getEndTime() == null) {
                throw new BadRequestException("Vui lòng nhập đủ giờ mở và giờ đóng cho dòng đối tượng " + (index + 1));
            }
            if (!target.getStartTime().isBefore(target.getEndTime())) {
                throw new BadRequestException("Giờ đóng phải sau giờ mở ở dòng đối tượng " + (index + 1));
            }
            ExamTarget.TargetMode mode = target.getTargetMode() == null ? ExamTarget.TargetMode.CLASS : target.getTargetMode();
            boolean hasClassSelection = hasAnyText(target.getClassIds()) || hasAnyText(target.getClassCodes());
            boolean hasStudentSelection = hasAnyText(target.getStudentIds()) || hasAnyText(target.getStudentCodes());
            if (mode == ExamTarget.TargetMode.CLASS && !hasClassSelection) {
                throw new BadRequestException("Vui lòng chọn ít nhất một lớp ở dòng đối tượng " + (index + 1));
            }
            if (mode == ExamTarget.TargetMode.STUDENT && !hasStudentSelection) {
                throw new BadRequestException("Vui lòng chọn ít nhất một sinh viên ở dòng đối tượng " + (index + 1));
            }
            if (mode == ExamTarget.TargetMode.BOTH && !hasClassSelection && !hasStudentSelection) {
                throw new BadRequestException("Vui lòng chọn lớp hoặc sinh viên ở dòng đối tượng " + (index + 1));
            }
            if (mode != ExamTarget.TargetMode.STUDENT) {
                ensureNoDuplicateTargets(
                        usedClassKeys,
                        targetKeys(target.getClassIds(), target.getClassCodes()),
                        "Lớp đã được áp dụng ở khung giờ khác. Vui lòng bỏ chọn lớp trùng ở dòng đối tượng " + (index + 1)
                );
            }
            if (hasStudentSelection) {
                ensureNoDuplicateTargets(
                        usedStudentKeys,
                        targetKeys(target.getStudentIds(), target.getStudentCodes()),
                        "Sinh viên đã được áp dụng ở khung giờ khác. Vui lòng bỏ chọn sinh viên trùng ở dòng đối tượng " + (index + 1)
                );
            }
        }
    }

    private void validateQuestionRequest(QuestionRequest request) {
        long correctCount = request.getOptions().stream().filter(OptionRequest::isCorrect).count();
        if (correctCount != 1) {
            throw new BadRequestException("Mỗi câu hỏi phải có đúng 1 đáp án đúng");
        }
    }

    private void validateExamOpen(Exam exam, ExamTarget target) {
        LocalDateTime now = LocalDateTime.now();
        if (exam.getStatus() != Exam.Status.ACTIVE) {
            throw new BadRequestException("Kỳ thi chưa được mở");
        }
        if (now.isBefore(target.getStartTime())) {
            throw new BadRequestException("Chưa đến thời gian làm bài");
        }
        if (now.isAfter(target.getEndTime())) {
            throw new BadRequestException("Kỳ thi đã đóng");
        }
    }

    private String resolveStudentGroupCode(String userCode) {
        return studentGroupCode(resolveStudentProfile(userCode));
    }

    private UserProfileDTO resolveStudentProfile(String userCode) {
        try {
            UserProfileDTO profile = userClient.getProfileByStudentId(INTERNAL_ROLE, INTERNAL_USER_CODE, userCode);
            if (profile == null) {
                throw new BadRequestException("Không tìm thấy hồ sơ sinh viên.");
            }
            String groupCode = studentGroupCode(profile);
            if (!STUDENT_GROUP_NAMES.containsKey(groupCode)) {
                throw new BadRequestException("Nhóm thi của sinh viên không hợp lệ.");
            }
            return profile;
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Không xác định được hồ sơ sinh viên. Vui lòng liên hệ Phòng CTSV.");
        }
    }

    private String studentGroupCode(UserProfileDTO profile) {
        if (profile == null || profile.getStudentGroup() == null) {
            throw new BadRequestException("Không xác định được nhóm thi của sinh viên.");
        }

        String groupCode = normalizeGroupCode(profile.getStudentGroup().getCode());
        if (groupCode.isBlank() && profile.getStudentGroup().getId() != null) {
            groupCode = String.valueOf(profile.getStudentGroup().getId());
        }
        return groupCode;
    }

    private Optional<ExamTarget> findMatchingTarget(Exam exam, UserProfileDTO profile) {
        List<ExamTarget> matchedTargets = targetsForExam(exam).stream()
                .filter(target -> targetMatchesProfile(target, profile))
                .toList();
        if (matchedTargets.isEmpty()) {
            return Optional.empty();
        }

        LocalDateTime now = LocalDateTime.now();
        return matchedTargets.stream()
                .filter(target -> !now.isBefore(target.getStartTime()) && !now.isAfter(target.getEndTime()))
                .min(Comparator.comparing(ExamTarget::getStartTime))
                .or(() -> matchedTargets.stream()
                        .filter(target -> now.isBefore(target.getStartTime()))
                        .min(Comparator.comparing(ExamTarget::getStartTime)))
                .or(() -> matchedTargets.stream()
                        .max(Comparator.comparing(ExamTarget::getEndTime)));
    }

    private boolean targetMatchesProfile(ExamTarget target, UserProfileDTO profile) {
        if (!Objects.equals(normalizeGroupCode(target.getStudentGroupCode()), studentGroupCode(profile))) {
            return false;
        }

        UserProfileDTO.ClazzDTO clazz = profile.getClazz();
        UserProfileDTO.FacultyDTO faculty = clazz == null ? null : clazz.getFaculty();
        if (hasText(target.getFacultyId()) || hasText(target.getFacultyCode())) {
            if (faculty == null) {
                return false;
            }
            boolean facultyIdMatches = !hasText(target.getFacultyId()) || textEquals(target.getFacultyId(), faculty.getId());
            boolean facultyCodeMatches = !hasText(target.getFacultyCode()) || textEquals(target.getFacultyCode(), faculty.getFacultyCode());
            if (!facultyIdMatches || !facultyCodeMatches) {
                return false;
            }
        }

        Set<String> classIdentifiers = targetClassIdentifiers(target);
        Set<String> studentIdentifiers = targetStudentIdentifiers(target);
        ExamTarget.TargetMode mode = target.getTargetMode() == null ? ExamTarget.TargetMode.CLASS : target.getTargetMode();

        boolean hasClassSelection = !classIdentifiers.isEmpty();
        boolean hasStudentSelection = !studentIdentifiers.isEmpty();
        boolean classMatches = false;
        if (hasClassSelection) {
            if (clazz == null) {
                classMatches = false;
            } else {
                classMatches = classIdentifiers.contains(normalizeKey(clazz.getId()))
                        || classIdentifiers.contains(normalizeKey(clazz.getClassCode()));
            }
        }

        boolean studentMatches = false;
        if (hasStudentSelection) {
            studentMatches = studentIdentifiers.contains(normalizeKey(profile.getId()))
                    || studentIdentifiers.contains(normalizeKey(profile.getStudentId()));
        }

        if (mode == ExamTarget.TargetMode.STUDENT) {
            return hasStudentSelection && studentMatches;
        }
        if (mode == ExamTarget.TargetMode.BOTH) {
            return (hasClassSelection && classMatches) || (hasStudentSelection && studentMatches);
        }
        return hasClassSelection && classMatches;
    }

    private List<ExamTarget> targetsForExam(Exam exam) {
        if (exam.getTargets() != null && !exam.getTargets().isEmpty()) {
            return exam.getTargets();
        }
        return List.of(legacyTarget(exam));
    }

    private ExamTarget primaryTarget(Exam exam) {
        return targetsForExam(exam).stream()
                .min(Comparator.comparing(ExamTarget::getStartTime))
                .orElseGet(() -> legacyTarget(exam));
    }

    private ExamTarget legacyTarget(Exam exam) {
        ExamTarget target = new ExamTarget();
        target.setId(null);
        target.setExam(exam);
        target.setStudentGroupCode(examGroupCode(exam));
        target.setTargetMode(ExamTarget.TargetMode.CLASS);
        target.setStartTime(exam.getStartTime());
        target.setEndTime(exam.getEndTime());
        return target;
    }

    private String examGroupCode(Exam exam) {
        String groupCode = normalizeGroupCode(exam.getTargetGroupCode());
        return groupCode.isBlank() ? "1" : groupCode;
    }

    private String normalizeGroupCode(String value) {
        if (value == null) {
            return "";
        }
        String groupCode = value.trim();
        if (groupCode.endsWith(".0")) {
            groupCode = groupCode.substring(0, groupCode.length() - 2);
        }
        return groupCode;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean hasAnyText(List<String> values) {
        return values != null && values.stream().anyMatch(this::hasText);
    }

    private List<String> preferredIdentifiers(List<String> primaryValues, List<String> fallbackValues) {
        List<String> primary = cleanIdentifiers(primaryValues);
        return primary.isEmpty() ? cleanIdentifiers(fallbackValues) : primary;
    }

    private List<String> cleanIdentifiers(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(this::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private void addTargetClasses(ExamTarget target, List<String> classIdentifiers) {
        classIdentifiers.forEach(identifier -> {
            ExamTargetClass targetClass = new ExamTargetClass();
            targetClass.setTarget(target);
            targetClass.setClassIdentifier(identifier);
            target.getClasses().add(targetClass);
        });
    }

    private void addTargetStudents(ExamTarget target, List<String> studentIdentifiers) {
        studentIdentifiers.forEach(identifier -> {
            ExamTargetStudent targetStudent = new ExamTargetStudent();
            targetStudent.setTarget(target);
            targetStudent.setStudentIdentifier(identifier);
            target.getStudents().add(targetStudent);
        });
    }

    private List<String> targetClassIdentifiersList(ExamTarget target) {
        if (target.getClasses() == null) {
            return List.of();
        }
        return target.getClasses().stream()
                .map(ExamTargetClass::getClassIdentifier)
                .filter(this::hasText)
                .toList();
    }

    private List<String> targetStudentIdentifiersList(ExamTarget target) {
        if (target.getStudents() == null) {
            return List.of();
        }
        return target.getStudents().stream()
                .map(ExamTargetStudent::getStudentIdentifier)
                .filter(this::hasText)
                .toList();
    }

    private Set<String> targetClassIdentifiers(ExamTarget target) {
        return targetClassIdentifiersList(target).stream()
                .map(this::normalizeKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<String> targetStudentIdentifiers(ExamTarget target) {
        return targetStudentIdentifiersList(target).stream()
                .map(this::normalizeKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<String> targetKeys(List<String> ids, List<String> codes) {
        Set<String> keys = new LinkedHashSet<>();
        if (ids != null) {
            ids.stream()
                    .filter(this::hasText)
                    .map(this::normalizeKey)
                    .forEach(value -> keys.add("id:" + value));
        }
        if (codes != null) {
            codes.stream()
                    .filter(this::hasText)
                    .map(this::normalizeKey)
                    .forEach(value -> keys.add("code:" + value));
        }
        return keys;
    }

    private void ensureNoDuplicateTargets(Set<String> usedKeys, Set<String> currentKeys, String message) {
        for (String key : currentKeys) {
            if (!usedKeys.add(key)) {
                throw new BadRequestException(message);
            }
        }
    }

    private boolean textEquals(String left, String right) {
        return normalizeKey(left).equals(normalizeKey(right));
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private List<ExamTargetRequest> normalizedTargetRequests(ExamRequest request) {
        if (request.getTargets() == null) {
            return List.of();
        }
        return request.getTargets().stream()
                .filter(Objects::nonNull)
                .toList();
    }

    private String targetGroupName(String groupCode) {
        return STUDENT_GROUP_NAMES.getOrDefault(normalizeGroupCode(groupCode), "Không xác định");
    }

    private void requireInProgress(ExamAttempt attempt) {
        if (attempt.getStatus() != ExamAttempt.Status.IN_PROGRESS) {
            throw new BadRequestException("Lượt thi không ở trạng thái đang làm bài");
        }
    }

    private Exam getExam(Long id) {
        return examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kỳ thi"));
    }

    private Question getQuestion(Long id) {
        return questionRepository.findWithOptionsById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy câu hỏi"));
    }

    private ExamAttempt getAttempt(Long examId, String userCode) {
        return attemptRepository.findByExamIdAndUserTsid(examId, userCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt thi của sinh viên"));
    }

    private void requireQuestionBelongsToExam(Question question, Long examId) {
        if (!question.getExam().getId().equals(examId)) {
            throw new BadRequestException("Câu hỏi không thuộc kỳ thi này");
        }
    }

    private ExamResponse toExamResponse(Exam exam) {
        String targetGroupCode = examGroupCode(exam);
        return ExamResponse.builder()
                .id(String.valueOf(exam.getId()))
                .title(exam.getTitle())
                .description(exam.getDescription())
                .startTime(exam.getStartTime())
                .endTime(exam.getEndTime())
                .durationMins(exam.getDurationMins())
                .questionCount(exam.getQuestionCount())
                .targetGroupCode(targetGroupCode)
                .targetGroupName(targetGroupName(targetGroupCode))
                .targets(targetsForExam(exam).stream().map(this::toTargetResponse).toList())
                .availableQuestionCount(questionRepository.countByExamId(exam.getId()))
                .status(exam.getStatus())
                .createdBy(exam.getCreatedBy())
                .createdAt(exam.getCreatedAt())
                .updatedAt(exam.getUpdatedAt())
                .build();
    }

    private QuestionResponse toQuestionResponse(Question question, boolean includeCorrect) {
        return QuestionResponse.builder()
                .id(String.valueOf(question.getId()))
                .examId(String.valueOf(question.getExam().getId()))
                .content(question.getContent())
                .options(question.getOptions().stream()
                        .map(option -> OptionResponse.builder()
                                .id(String.valueOf(option.getId()))
                                .content(option.getContent())
                                .correct(includeCorrect ? option.isCorrect() : null)
                                .build())
                        .toList())
                .build();
    }

    private AttemptResponse toAttemptResponse(ExamAttempt attempt) {
        return AttemptResponse.builder()
                .id(String.valueOf(attempt.getId()))
                .examId(String.valueOf(attempt.getExam().getId()))
                .examTitle(attempt.getExam().getTitle())
                .userTsid(attempt.getUserTsid())
                .score(attempt.getScore())
                .correctCount(attempt.getCorrectCount())
                .totalQuestions(attempt.getTotalQuestions())
                .violationCount(attempt.getViolationCount())
                .status(attempt.getStatus())
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .lockedReason(attempt.getLockedReason())
                .build();
    }

    private ExamTargetResponse toTargetResponse(ExamTarget target) {
        String groupCode = normalizeGroupCode(target.getStudentGroupCode());
        return ExamTargetResponse.builder()
                .id(target.getId() == null ? null : String.valueOf(target.getId()))
                .targetGroupCode(groupCode)
                .targetGroupName(targetGroupName(groupCode))
                .facultyId(target.getFacultyId())
                .facultyCode(target.getFacultyCode())
                .facultyName(target.getFacultyName())
                .classIds(targetClassIdentifiersList(target))
                .classCodes(List.of())
                .targetMode(target.getTargetMode() == null ? ExamTarget.TargetMode.CLASS : target.getTargetMode())
                .studentIds(targetStudentIdentifiersList(target))
                .studentCodes(List.of())
                .studentNames(List.of())
                .startTime(target.getStartTime())
                .endTime(target.getEndTime())
                .build();
    }

    private StudentExamSummary toStudentSummary(Exam exam, ExamTarget target, ExamAttempt attempt) {
        String availability = availabilityStatus(exam, target, attempt);
        String targetGroupCode = normalizeGroupCode(target.getStudentGroupCode());
        return StudentExamSummary.builder()
                .id(String.valueOf(exam.getId()))
                .title(exam.getTitle())
                .description(exam.getDescription())
                .startTime(target.getStartTime())
                .endTime(target.getEndTime())
                .durationMins(exam.getDurationMins())
                .questionCount(exam.getQuestionCount())
                .targetGroupCode(targetGroupCode)
                .targetGroupName(targetGroupName(targetGroupCode))
                .eligibleTarget(toTargetResponse(target))
                .availabilityStatus(availability)
                .attemptStatus(attempt == null ? ExamAttempt.Status.NOT_STARTED : attempt.getStatus())
                .score(attempt == null ? null : attempt.getScore())
                .violationCount(attempt == null ? 0 : attempt.getViolationCount())
                .startedAt(attempt == null ? null : attempt.getStartedAt())
                .submittedAt(attempt == null ? null : attempt.getSubmittedAt())
                .build();
    }

    private String availabilityStatus(Exam exam, ExamTarget target, ExamAttempt attempt) {
        if (attempt != null && attempt.getStatus() == ExamAttempt.Status.SUBMITTED) return "COMPLETED";
        if (attempt != null && attempt.getStatus() == ExamAttempt.Status.LOCKED) return "LOCKED";
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(target.getStartTime())) return "UPCOMING";
        if (now.isAfter(target.getEndTime())) return "CLOSED";
        if (attempt != null && attempt.getStatus() == ExamAttempt.Status.IN_PROGRESS) return "IN_PROGRESS";
        return "AVAILABLE";
    }

    private List<Long> parseIds(List<String> ids) {
        return ids.stream().map(id -> parseLong(id, "Mã không hợp lệ")).toList();
    }

    private Long parseLong(String value, String message) {
        try {
            return Long.parseLong(value);
        } catch (Exception ex) {
            throw new BadRequestException(message);
        }
    }

    private Sheet findQuestionSheet(Workbook workbook, DataFormatter formatter) {
        for (int sheetIndex = 0; sheetIndex < workbook.getNumberOfSheets(); sheetIndex++) {
            Sheet sheet = workbook.getSheetAt(sheetIndex);
            if (findQuestionHeaderRowNumber(sheet, formatter) >= 0) {
                return sheet;
            }
        }
        return workbook.getSheetAt(0);
    }

    private int findQuestionHeaderRowNumber(Sheet sheet, DataFormatter formatter) {
        int lastRowToScan = Math.min(sheet.getLastRowNum(), sheet.getFirstRowNum() + 15);
        for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= lastRowToScan; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row != null && looksLikeHeader(row, formatter)) {
                return rowIndex;
            }
        }
        return -1;
    }

    private boolean isEmptyQuestionRow(Row row, DataFormatter formatter) {
        for (int index = 0; index <= 5; index++) {
            if (!readString(row, index, formatter).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String readString(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell).trim().replaceAll("\\s+", " ");
    }

    private boolean looksLikeHeader(Row row, DataFormatter formatter) {
        String firstColumn = normalizeText(readString(row, 0, formatter));
        String answerColumn = normalizeText(readString(row, 5, formatter));
        return (firstColumn.contains("cau") || firstColumn.contains("question"))
                && (answerColumn.contains("dap an") || answerColumn.contains("answer") || answerColumn.contains("correct"));
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").replace('đ', 'd');
    }

    private String readString(Row row, int index) {
        Cell cell = row.getCell(index);
        if (cell == null) return "";
        if (cell.getCellType() == CellType.NUMERIC) {
            double numeric = cell.getNumericCellValue();
            if (numeric == Math.floor(numeric)) {
                return String.valueOf((long) numeric);
            }
            return String.valueOf(numeric);
        }
        cell.setCellType(CellType.STRING);
        return cell.getStringCellValue() == null ? "" : cell.getStringCellValue().trim();
    }

    private boolean looksLikeHeader(Row row) {
        return readString(row, 0).toLowerCase(Locale.ROOT).contains("câu")
                || readString(row, 0).toLowerCase(Locale.ROOT).contains("question");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
