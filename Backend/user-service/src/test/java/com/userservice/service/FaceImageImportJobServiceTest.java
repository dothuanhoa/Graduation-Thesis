package com.userservice.service;

import com.userservice.dto.FaceImageBulkImportResponse;
import com.userservice.dto.FaceImageImportItemResult;
import com.userservice.dto.FaceImageImportProgress;
import com.userservice.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FaceImageImportJobServiceTest {
    @Mock private UserService userService;
    private FaceImageImportJobService jobService;

    @BeforeEach
    void setUp() {
        jobService = new FaceImageImportJobService(userService);
        ReflectionTestUtils.setField(jobService, "maxBulkFiles", 200);
    }

    @AfterEach
    void tearDown() {
        jobService.shutdown();
    }

    @Test
    @SuppressWarnings("unchecked")
    void jobPublishesRealProcessingProgressAndFinalResult() throws Exception {
        FaceImageImportItemResult item = FaceImageImportItemResult.builder()
                .fileName("DH52201258.jpg")
                .studentId("DH52201258")
                .success(true)
                .message("OK")
                .build();
        FaceImageBulkImportResponse result = FaceImageBulkImportResponse.builder()
                .total(1)
                .succeeded(1)
                .failed(0)
                .items(List.of(item))
                .build();
        when(userService.importFaceImages(anyList(), any(Consumer.class))).thenAnswer(invocation -> {
            List<org.springframework.web.multipart.MultipartFile> storedFiles = invocation.getArgument(0);
            assertThat(storedFiles).singleElement().satisfies(file -> {
                assertThat(file.getOriginalFilename()).isEqualTo("DH52201258.jpg");
                assertThat(file.getBytes()).isNotEmpty();
            });
            Consumer<FaceImageBulkImportResponse> callback = invocation.getArgument(1);
            callback.accept(result);
            return result;
        });

        var started = jobService.start(List.of(new MockMultipartFile(
                "files",
                "DH52201258.jpg",
                "image/jpeg",
                "image-content".getBytes()
        )));
        FaceImageImportProgress completed = awaitCompletion(started.getJobId());

        assertThat(completed.getStatus()).isEqualTo(FaceImageImportProgress.Status.COMPLETED);
        assertThat(completed.getProgressPercent()).isEqualTo(100);
        assertThat(completed.getProcessedFiles()).isEqualTo(1);
        assertThat(completed.getSucceeded()).isEqualTo(1);
        assertThat(completed.getItems()).singleElement().extracting("studentId").isEqualTo("DH52201258");
    }

    @Test
    void rejectsAnEmptyFolderBeforeCreatingAJob() {
        assertThatThrownBy(() -> jobService.start(List.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("folder ảnh");
    }

    @Test
    void rejectsFoldersAboveTheConfiguredLimit() {
        ReflectionTestUtils.setField(jobService, "maxBulkFiles", 1);
        MockMultipartFile first = new MockMultipartFile("files", "DH001.jpg", "image/jpeg", new byte[]{1});
        MockMultipartFile second = new MockMultipartFile("files", "DH002.jpg", "image/jpeg", new byte[]{2});

        assertThatThrownBy(() -> jobService.start(List.of(first, second)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("tối đa 1 ảnh");
    }

    private FaceImageImportProgress awaitCompletion(String jobId) throws InterruptedException {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(3));
        FaceImageImportProgress current;
        do {
            current = jobService.get(jobId).orElseThrow();
            if (current.getStatus() == FaceImageImportProgress.Status.COMPLETED
                    || current.getStatus() == FaceImageImportProgress.Status.FAILED) {
                return current;
            }
            Thread.sleep(20);
        } while (Instant.now().isBefore(deadline));
        throw new AssertionError("Job import ảnh không hoàn tất trong thời gian chờ");
    }
}
