package com.certificationservice.service.impl;

import com.certificationservice.service.FileService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class FileServiceImpl implements FileService {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "jpg", "jpeg", "png");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/pjpeg",
            "image/png",
            "image/x-png"
    );

    private final Path fileStorageLocation;
    private final String publicUrlPrefix;
    private final long maxSizeBytes;

    public FileServiceImpl(
            @Value("${app.upload.dir:../../Frontend/user-frontend/public/certification}") String uploadDir,
            @Value("${app.upload.public-url-prefix:/certification}") String publicUrlPrefix,
            @Value("${app.upload.max-size-bytes:10485760}") long maxSizeBytes
    ) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicUrlPrefix = publicUrlPrefix.endsWith("/")
                ? publicUrlPrefix.substring(0, publicUrlPrefix.length() - 1)
                : publicUrlPrefix;
        this.maxSizeBytes = maxSizeBytes;

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Không tạo được thư mục lưu file minh chứng.", ex);
        }
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        validateFile(file);

        String extension = normalizeExtension(resolveExtension(file));
        String fileName = UUID.randomUUID() + "." + extension;

        try {
            String academicYear = getCurrentAcademicYear();
            Path academicYearLocation = this.fileStorageLocation.resolve(academicYear).normalize();
            if (!academicYearLocation.startsWith(this.fileStorageLocation)) {
                throw new RuntimeException("Thư mục năm học không hợp lệ: " + academicYear);
            }
            Files.createDirectories(academicYearLocation);

            Path targetLocation = academicYearLocation.resolve(fileName).normalize();
            if (!targetLocation.startsWith(academicYearLocation)) {
                throw new RuntimeException("Tên file không hợp lệ: " + fileName);
            }
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return publicUrlPrefix
                    + "/"
                    + academicYear
                    + "/"
                    + UriUtils.encodePathSegment(fileName, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IOException("Không lưu được file " + fileName + ".", ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileName) throws IOException {
        String decodedFileName = URLDecoder.decode(fileName, StandardCharsets.UTF_8);
        String cleanedFileName = StringUtils.cleanPath(decodedFileName);
        if (cleanedFileName.contains("..")) {
            throw new FileNotFoundException("Tên file không hợp lệ: " + cleanedFileName);
        }

        Path filePath = this.fileStorageLocation.resolve(cleanedFileName).normalize();
        if (!filePath.startsWith(this.fileStorageLocation)) {
            throw new FileNotFoundException("Tên file không hợp lệ: " + cleanedFileName);
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException("Không tìm thấy file minh chứng: " + cleanedFileName);
        }
        return resource;
    }

    private void validateFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn file minh chứng.");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException("File minh chứng không được vượt quá " + formatMaxSize() + ".");
        }

        String extension = normalizeExtension(resolveExtension(file));
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Chỉ hỗ trợ file PDF, JPG hoặc PNG.");
        }

        String contentType = Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT);
        if (!contentType.isBlank() && !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File minh chứng phải là PDF, JPG hoặc PNG.");
        }

        validateMagicBytes(file, extension);
    }

    private String resolveExtension(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(
                Objects.requireNonNullElse(file.getOriginalFilename(), "minh-chung")
        );
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex >= 0 && dotIndex < originalFileName.length() - 1) {
            return originalFileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        }
        return extensionFromContentType(file.getContentType());
    }

    private String extensionFromContentType(String contentType) {
        String normalizedContentType = Objects.toString(contentType, "").toLowerCase(Locale.ROOT);
        return switch (normalizedContentType) {
            case "application/pdf" -> "pdf";
            case "image/jpeg", "image/jpg", "image/pjpeg" -> "jpg";
            case "image/png", "image/x-png" -> "png";
            default -> "";
        };
    }

    private String normalizeExtension(String extension) {
        return "jpeg".equals(extension) ? "jpg" : extension;
    }

    private void validateMagicBytes(MultipartFile file, String extension) throws IOException {
        byte[] header;
        try (var inputStream = file.getInputStream()) {
            header = inputStream.readNBytes(8);
        }

        boolean valid = switch (extension) {
            case "pdf" -> startsWith(header, new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D});
            case "jpg" -> header.length >= 3
                    && (header[0] & 0xFF) == 0xFF
                    && (header[1] & 0xFF) == 0xD8
                    && (header[2] & 0xFF) == 0xFF;
            case "png" -> startsWith(header, new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            default -> false;
        };

        if (!valid) {
            throw new IllegalArgumentException("Nội dung file không khớp định dạng PDF/JPG/PNG.");
        }
    }

    private boolean startsWith(byte[] source, byte[] prefix) {
        if (source.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if (source[index] != prefix[index]) {
                return false;
            }
        }
        return true;
    }

    private String formatMaxSize() {
        long megabytes = Math.max(1, maxSizeBytes / 1024 / 1024);
        return megabytes + "MB";
    }

    private String getCurrentAcademicYear() {
        LocalDate today = LocalDate.now();
        int startYear = today.getMonthValue() >= 9 ? today.getYear() : today.getYear() - 1;
        return startYear + "-" + (startYear + 1);
    }
}
