package com.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceImageImportProgress {
    private String jobId;
    private Status status;
    private int totalFiles;
    private int processedFiles;
    private int succeeded;
    private int failed;
    private int progressPercent;
    private String message;
    private String error;
    @Builder.Default
    private List<FaceImageImportItemResult> items = new ArrayList<>();
    private Instant startedAt;
    private Instant finishedAt;

    public enum Status {
        QUEUED,
        PROCESSING,
        COMPLETED,
        FAILED
    }
}
