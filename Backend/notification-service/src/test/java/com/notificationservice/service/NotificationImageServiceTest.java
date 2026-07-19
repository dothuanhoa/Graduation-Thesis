package com.notificationservice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationImageServiceTest {
    @TempDir
    Path tempDir;

    @Test
    void uploadImageStoresFileUnderNotificationPublicFolder() throws Exception {
        NotificationImageService service = new NotificationImageService(tempDir.toString(), "/notification", 1024 * 1024);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "banner.png",
                "image/png",
                new byte[]{1, 2, 3}
        );

        String fileUrl = service.uploadImage(file);

        String year = String.valueOf(LocalDate.now().getYear());
        String fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
        assertThat(fileUrl).startsWith("/notification/" + year + "/").endsWith(".png");
        assertThat(Files.exists(tempDir.resolve(year).resolve(fileName))).isTrue();
    }

    @Test
    void uploadPastedImageWithoutExtensionUsesContentTypeAndCreatesYearFolder() throws Exception {
        Path missingBaseDir = tempDir.resolve("public").resolve("notification");
        NotificationImageService service = new NotificationImageService(missingBaseDir.toString(), "/notification", 1024 * 1024);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "blobid0",
                "image/png",
                new byte[]{1, 2, 3}
        );

        String fileUrl = service.uploadImage(file);

        String year = String.valueOf(LocalDate.now().getYear());
        String fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
        assertThat(fileUrl).startsWith("/notification/" + year + "/").endsWith(".png");
        assertThat(Files.exists(missingBaseDir.resolve(year).resolve(fileName))).isTrue();
    }

    @Test
    void uploadImageRejectsNonImageFile() {
        NotificationImageService service = new NotificationImageService(tempDir.toString(), "/notification", 1024 * 1024);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "note.txt",
                "text/plain",
                "hello".getBytes()
        );

        assertThatThrownBy(() -> service.uploadImage(file))
                .isInstanceOf(IllegalArgumentException.class);
    }
}