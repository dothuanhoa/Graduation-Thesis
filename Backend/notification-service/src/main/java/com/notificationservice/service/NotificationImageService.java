package com.notificationservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
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
public class NotificationImageService {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");

    private final Path imageStorageLocation;
    private final String publicUrlPrefix;
    private final long maxSizeBytes;

    public NotificationImageService(
            @Value("${app.notification.upload.dir:../../Frontend/user-frontend/public/notification}") String uploadDir,
            @Value("${app.notification.upload.public-url-prefix:/notification}") String publicUrlPrefix,
            @Value("${app.notification.upload.max-size-bytes:5242880}") long maxSizeBytes
    ) {
        this.imageStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicUrlPrefix = publicUrlPrefix.endsWith("/")
                ? publicUrlPrefix.substring(0, publicUrlPrefix.length() - 1)
                : publicUrlPrefix;
        this.maxSizeBytes = maxSizeBytes;

        try {
            Files.createDirectories(this.imageStorageLocation);
        } catch (IOException ex) {
            throw new IllegalStateException("Khong tao duoc thu muc luu anh thong bao.", ex);
        }
    }

    public String uploadImage(MultipartFile file) throws IOException {
        validateImage(file);

        String extension = resolveExtension(file);
        String fileName = UUID.randomUUID() + "." + extension;
        String yearFolder = String.valueOf(LocalDate.now().getYear());
        Path yearLocation = imageStorageLocation.resolve(yearFolder).normalize();
        if (!yearLocation.startsWith(imageStorageLocation)) {
            throw new IllegalArgumentException("Thu muc luu anh khong hop le.");
        }
        Files.createDirectories(yearLocation);

        Path targetLocation = yearLocation.resolve(fileName).normalize();
        if (!targetLocation.startsWith(yearLocation)) {
            throw new IllegalArgumentException("Ten file anh khong hop le.");
        }

        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return publicUrlPrefix
                + "/"
                + yearFolder
                + "/"
                + UriUtils.encodePathSegment(fileName, StandardCharsets.UTF_8);
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui long chon anh can tai len.");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException("Anh khong duoc vuot qua " + (maxSizeBytes / 1024 / 1024) + "MB.");
        }

        String contentType = Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT);
        if (!contentType.isBlank() && !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File tai len phai la hinh anh.");
        }

        String extension = resolveExtension(file);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Chi ho tro anh JPG, PNG, GIF hoac WEBP.");
        }
    }

    private String resolveExtension(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "image"));
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex >= 0 && dotIndex < originalFileName.length() - 1) {
            String extension = originalFileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
            if (ALLOWED_EXTENSIONS.contains(extension)) {
                return normalizeExtension(extension);
            }
        }

        return extensionFromContentType(file.getContentType());
    }

    private String extensionFromContentType(String contentType) {
        String normalizedContentType = Objects.toString(contentType, "").toLowerCase(Locale.ROOT);
        return switch (normalizedContentType) {
            case "image/jpeg", "image/jpg", "image/pjpeg" -> "jpg";
            case "image/png", "image/x-png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> throw new IllegalArgumentException("Anh tai len can co dinh dang JPG, PNG, GIF hoac WEBP.");
        };
    }

    private String normalizeExtension(String extension) {
        return "jpeg".equals(extension) ? "jpg" : extension;
    }
}