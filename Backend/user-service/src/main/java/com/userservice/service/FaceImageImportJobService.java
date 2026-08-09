package com.userservice.service;

import com.userservice.dto.FaceImageBulkImportResponse;
import com.userservice.dto.FaceImageImportProgress;
import com.userservice.exception.BadRequestException;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class FaceImageImportJobService {
    private final UserService userService;
    private final ConcurrentMap<String, FaceImageImportProgress> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newFixedThreadPool(2);

    @Value("${app.student-face.max-bulk-files:200}")
    private int maxBulkFiles;

    public FaceImageImportJobService(UserService userService) {
        this.userService = userService;
    }

    public FaceImageImportProgress start(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn một folder ảnh sinh viên");
        }
        if (files.size() > maxBulkFiles) {
            throw new BadRequestException("Mỗi lần chỉ được gửi tối đa " + maxBulkFiles + " ảnh");
        }

        Path jobDirectory = createJobDirectory();
        List<StoredUpload> storedUploads;
        try {
            storedUploads = persistUploads(files, jobDirectory);
        } catch (RuntimeException ex) {
            deleteDirectory(jobDirectory);
            throw ex;
        }

        String jobId = UUID.randomUUID().toString();
        FaceImageImportProgress progress = FaceImageImportProgress.builder()
                .jobId(jobId)
                .status(FaceImageImportProgress.Status.QUEUED)
                .totalFiles(files.size())
                .processedFiles(0)
                .progressPercent(0)
                .message("Đã nhận folder ảnh, đang chờ xử lý.")
                .startedAt(Instant.now())
                .build();
        jobs.put(jobId, progress);
        executorService.submit(() -> runImport(progress, storedUploads, jobDirectory));
        return progress;
    }

    public Optional<FaceImageImportProgress> get(String jobId) {
        return Optional.ofNullable(jobs.get(jobId));
    }

    private void runImport(
            FaceImageImportProgress progress,
            List<StoredUpload> uploads,
            Path jobDirectory
    ) {
        try {
            progress.setStatus(FaceImageImportProgress.Status.PROCESSING);
            progress.setProgressPercent(1);
            progress.setMessage("Đang kiểm tra MSSV và phân tích ảnh bằng AWS Rekognition.");
            List<MultipartFile> multipartFiles = uploads.stream()
                    .map(StoredMultipartFile::new)
                    .map(MultipartFile.class::cast)
                    .toList();
            FaceImageBulkImportResponse result = userService.importFaceImages(
                    multipartFiles,
                    update -> applyUpdate(progress, update)
            );
            applyUpdate(progress, result);
            progress.setStatus(FaceImageImportProgress.Status.COMPLETED);
            progress.setProgressPercent(100);
            progress.setMessage("Đã xử lý xong " + result.getTotal() + " ảnh: "
                    + result.getSucceeded() + " thành công, " + result.getFailed() + " thất bại.");
            progress.setFinishedAt(Instant.now());
        } catch (Exception ex) {
            progress.setStatus(FaceImageImportProgress.Status.FAILED);
            progress.setError(ex.getMessage());
            progress.setMessage("Import folder ảnh chưa hoàn tất. Vui lòng kiểm tra và thử lại.");
            progress.setFinishedAt(Instant.now());
        } finally {
            deleteDirectory(jobDirectory);
        }
    }

    private void applyUpdate(FaceImageImportProgress progress, FaceImageBulkImportResponse update) {
        int processed = update.getItems() == null ? 0 : update.getItems().size();
        progress.setProcessedFiles(processed);
        progress.setSucceeded(update.getSucceeded());
        progress.setFailed(update.getFailed());
        progress.setItems(update.getItems() == null ? List.of() : List.copyOf(update.getItems()));
        progress.setProgressPercent(update.getTotal() == 0 ? 0 : Math.min(99, processed * 100 / update.getTotal()));
        progress.setMessage("Đang xử lý ảnh " + processed + "/" + update.getTotal() + ".");
    }

    private Path createJobDirectory() {
        try {
            return Files.createTempDirectory("student-face-import-").toAbsolutePath().normalize();
        } catch (IOException ex) {
            throw new BadRequestException("Không tạo được thư mục tạm để xử lý folder ảnh");
        }
    }

    private List<StoredUpload> persistUploads(List<MultipartFile> files, Path jobDirectory) {
        List<StoredUpload> uploads = new ArrayList<>();
        for (int index = 0; index < files.size(); index++) {
            MultipartFile file = files.get(index);
            if (file == null) {
                throw new BadRequestException("Folder ảnh chứa file không hợp lệ");
            }
            Path target = jobDirectory.resolve(String.format("%04d.upload", index)).normalize();
            if (!target.startsWith(jobDirectory)) {
                throw new BadRequestException("Đường dẫn file tạm không hợp lệ");
            }
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ex) {
                throw new BadRequestException("Không đọc được file " + file.getOriginalFilename());
            }
            uploads.add(new StoredUpload(
                    target,
                    file.getName(),
                    file.getOriginalFilename(),
                    file.getContentType()
            ));
        }
        return uploads;
    }

    private void deleteDirectory(Path directory) {
        if (directory == null || !Files.exists(directory)) {
            return;
        }
        try (var paths = Files.walk(directory)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Thư mục tạm sẽ được hệ điều hành dọn dẹp nếu file đang bị khóa.
                }
            });
        } catch (IOException ignored) {
            // Không làm job thất bại chỉ vì không dọn được file tạm.
        }
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdownNow();
    }

    private record StoredUpload(Path path, String fieldName, String originalFilename, String contentType) {
    }

    private static final class StoredMultipartFile implements MultipartFile {
        private final StoredUpload upload;

        private StoredMultipartFile(StoredUpload upload) {
            this.upload = upload;
        }

        @Override
        public String getName() {
            return upload.fieldName();
        }

        @Override
        public String getOriginalFilename() {
            return upload.originalFilename();
        }

        @Override
        public String getContentType() {
            return upload.contentType();
        }

        @Override
        public boolean isEmpty() {
            return getSize() == 0;
        }

        @Override
        public long getSize() {
            try {
                return Files.size(upload.path());
            } catch (IOException ex) {
                return 0;
            }
        }

        @Override
        public byte[] getBytes() throws IOException {
            return Files.readAllBytes(upload.path());
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return Files.newInputStream(upload.path());
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException {
            transferTo(dest.toPath());
        }

        @Override
        public void transferTo(Path dest) throws IOException {
            Files.copy(upload.path(), dest, StandardCopyOption.REPLACE_EXISTING);
        }
    }
}
