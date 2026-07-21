package com.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentImportProgress {
    private String jobId;
    private Status status;
    private int totalRows;
    private int processedRows;
    private int createdStudents;
    private int updatedStudents;
    private int skippedStudents;
    private int authProcessed;
    private int authTotal;
    private int progressPercent;
    private String message;
    private String error;
    private Instant startedAt;
    private Instant finishedAt;

    public enum Status {
        QUEUED,
        PROCESSING,
        COMPLETED,
        FAILED
    }
}
