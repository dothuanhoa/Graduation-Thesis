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
import java.util.Objects;
import java.util.UUID;

@Service
public class FileServiceImpl implements FileService {

    private final Path fileStorageLocation;
    private final String publicUrlPrefix;

    public FileServiceImpl(
            @Value("${app.upload.dir:../../Frontend/user-frontend/public/certification}") String uploadDir,
            @Value("${app.upload.public-url-prefix:/certification}") String publicUrlPrefix
    ) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicUrlPrefix = publicUrlPrefix.endsWith("/")
                ? publicUrlPrefix.substring(0, publicUrlPrefix.length() - 1)
                : publicUrlPrefix;
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Không tạo được thư mục lưu file minh chứng.", ex);
        }
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        String originalFileName = StringUtils.cleanPath(
                Objects.requireNonNullElse(file.getOriginalFilename(), "minh-chung")
        );
        if (originalFileName.isBlank()) {
            originalFileName = "minh-chung";
        }
        String fileName = UUID.randomUUID().toString() + "_" + originalFileName;

        try {
            if (fileName.contains("..")) {
                throw new RuntimeException("Tên file không hợp lệ: " + fileName);
            }
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

    private String getCurrentAcademicYear() {
        LocalDate today = LocalDate.now();
        int startYear = today.getMonthValue() >= 9 ? today.getYear() : today.getYear() - 1;
        return startYear + "-" + (startYear + 1);
    }
}
