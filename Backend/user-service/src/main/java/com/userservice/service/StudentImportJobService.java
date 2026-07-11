package com.userservice.service;

import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@RequiredArgsConstructor
public class StudentImportJobService {
    private final UserService userService;
    private final ConcurrentMap<String, StudentImportProgress> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newFixedThreadPool(2);

    public StudentImportProgress start(List<StudentImportRow> rows) {
        String jobId = UUID.randomUUID().toString();
        StudentImportProgress progress = StudentImportProgress.builder()
                .jobId(jobId)
                .status(StudentImportProgress.Status.QUEUED)
                .totalRows(rows.size())
                .processedRows(0)
                .progressPercent(0)
                .message("Đã nhận file, đang chuẩn bị import.")
                .startedAt(Instant.now())
                .build();

        jobs.put(jobId, progress);
        executorService.submit(() -> runImport(progress, rows));
        return progress;
    }

    public Optional<StudentImportProgress> get(String jobId) {
        return Optional.ofNullable(jobs.get(jobId));
    }

    private void runImport(StudentImportProgress progress, List<StudentImportRow> rows) {
        try {
            progress.setStatus(StudentImportProgress.Status.PROCESSING);
            progress.setMessage("Đang import hồ sơ sinh viên.");
            progress.setProgressPercent(1);

            String result = userService.bulkImport(rows, update -> applyUpdate(progress, update));

            progress.setStatus(StudentImportProgress.Status.COMPLETED);
            progress.setMessage(result);
            progress.setProgressPercent(100);
            progress.setFinishedAt(Instant.now());
        } catch (Exception exception) {
            progress.setStatus(StudentImportProgress.Status.FAILED);
            progress.setError(exception.getMessage());
            progress.setMessage("Import chưa hoàn tất. Vui lòng kiểm tra lại file hoặc thử lại.");
            progress.setFinishedAt(Instant.now());
        }
    }

    private void applyUpdate(StudentImportProgress target, StudentImportProgress update) {
        target.setTotalRows(update.getTotalRows());
        target.setProcessedRows(update.getProcessedRows());
        target.setCreatedStudents(update.getCreatedStudents());
        target.setUpdatedStudents(update.getUpdatedStudents());
        target.setSkippedStudents(update.getSkippedStudents());
        target.setAuthProcessed(update.getAuthProcessed());
        target.setAuthTotal(update.getAuthTotal());
        target.setProgressPercent(update.getProgressPercent());
        target.setMessage(update.getMessage());
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdownNow();
    }
}
