package com.userservice.service.impl;

import com.userservice.client.AuthServiceClient;
import com.userservice.domain.Clazz;
import com.userservice.domain.StudentGroup;
import com.userservice.domain.UserProfile;
import com.userservice.dto.BulkStudentGroupRequest;
import com.userservice.exception.BadRequestException;
import com.userservice.repository.AcademicYearRepository;
import com.userservice.repository.ClassRepository;
import com.userservice.repository.StudentGroupRepository;
import com.userservice.repository.UserProfileRepository;
import com.userservice.service.OrganizationService;
import com.userservice.service.FaceAnalysisService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private ClassRepository classRepository;
    @Mock private AcademicYearRepository academicYearRepository;
    @Mock private StudentGroupRepository studentGroupRepository;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private OrganizationService organizationService;
    @Mock private FaceAnalysisService faceAnalysisService;

    @TempDir Path tempDir;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(
                userProfileRepository,
                classRepository,
                academicYearRepository,
                studentGroupRepository,
                authServiceClient,
                organizationService,
                faceAnalysisService
        );
        ReflectionTestUtils.setField(userService, "studentEmailDomain", "student.edu.vn");
        ReflectionTestUtils.setField(userService, "studentFaceUploadDir", tempDir.toString());
        ReflectionTestUtils.setField(userService, "studentFaceMaxSizeBytes", 5L * 1024 * 1024);
        ReflectionTestUtils.setField(userService, "studentFaceMaxBulkFiles", 200);
        ReflectionTestUtils.setField(userService, "studentFaceRekognitionThreshold", 90F);
    }

    @Test
    void saveCreatesDefaultEmailAndInitialAuthAccount() {
        StudentGroup defaultGroup = group(1, "1", "Dau khoa");
        Clazz targetClass = clazz(10L, "D22_TH01", Clazz.Status.ACTIVE);
        UserProfile profile = new UserProfile();
        profile.setStudentId("DH52201258");
        profile.setFullName("Tran Thanh Hoai Phuc");
        profile.setClazz(targetClass);
        profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        when(classRepository.findById(10L)).thenReturn(Optional.of(targetClass));
        when(studentGroupRepository.findByCode("1")).thenReturn(Optional.of(defaultGroup));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfile saved = userService.save(profile);

        assertThat(saved.getEmail()).isEqualTo("dh52201258@student.edu.vn");
        assertThat(saved.getStudentGroup()).isSameAs(defaultGroup);
        ArgumentCaptor<AuthServiceClient.RegisterRequest> requestCaptor = ArgumentCaptor.forClass(AuthServiceClient.RegisterRequest.class);
        verify(authServiceClient).registerAccount(eq("ADMIN"), eq(true), requestCaptor.capture());
        assertThat(requestCaptor.getValue().getUsername()).isEqualTo("DH52201258");
        assertThat(requestCaptor.getValue().getEmail()).isEqualTo("dh52201258@student.edu.vn");
    }

    @Test
    void saveCanSkipInitialAuthEmail() {
        StudentGroup defaultGroup = group(1, "1", "Dau khoa");
        Clazz targetClass = clazz(10L, "D22_TH01", Clazz.Status.ACTIVE);
        UserProfile profile = new UserProfile();
        profile.setStudentId("DH52201258");
        profile.setFullName("Tran Thanh Hoai Phuc");
        profile.setClazz(targetClass);
        profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        when(classRepository.findById(10L)).thenReturn(Optional.of(targetClass));
        when(studentGroupRepository.findByCode("1")).thenReturn(Optional.of(defaultGroup));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.save(profile, false);

        ArgumentCaptor<AuthServiceClient.RegisterRequest> requestCaptor = ArgumentCaptor.forClass(AuthServiceClient.RegisterRequest.class);
        verify(authServiceClient).registerAccount(eq("ADMIN"), eq(false), requestCaptor.capture());
        assertThat(requestCaptor.getValue().getUsername()).isEqualTo("DH52201258");
    }

    @Test
    void assignStudentsToClassRejectsWhenClassCapacityWouldExceed120() {
        Clazz targetClass = clazz(10L, "D22_TH04", Clazz.Status.ACTIVE);
        UserProfile first = student(1L, "DH1", null);
        UserProfile second = student(2L, "DH2", null);

        when(classRepository.findById(10L)).thenReturn(Optional.of(targetClass));
        when(userProfileRepository.findAllById(any())).thenReturn(List.of(first, second));
        when(userProfileRepository.countByClazzId(10L)).thenReturn(119L);

        assertThatThrownBy(() -> userService.assignStudentsToClass(List.of(1L, 2L), 10L))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void updateSyncsChangedEmailToAuthService() {
        StudentGroup currentGroup = group(1, "1", "Dau khoa");
        Clazz currentClass = clazz(10L, "D22_TH01", Clazz.Status.ACTIVE);
        UserProfile existing = student(1L, "DH52201258", currentClass);
        existing.setEmail("old@student.edu.vn");
        existing.setStudentGroup(currentGroup);
        existing.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        UserProfile request = new UserProfile();
        request.setStudentId("DH52201258");
        request.setFullName("Tran Thanh Hoai Phuc");
        request.setEmail("NEW@student.edu.vn");
        request.setClazz(currentClass);
        request.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(classRepository.findById(10L)).thenReturn(Optional.of(currentClass));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfile saved = userService.update(1L, request);

        assertThat(saved.getEmail()).isEqualTo("new@student.edu.vn");
        ArgumentCaptor<AuthServiceClient.UpdateEmailRequest> requestCaptor =
                ArgumentCaptor.forClass(AuthServiceClient.UpdateEmailRequest.class);
        verify(authServiceClient).updateEmail(eq("ADMIN"), eq("DH52201258"), requestCaptor.capture());
        assertThat(requestCaptor.getValue().getEmail()).isEqualTo("new@student.edu.vn");
    }

    @Test
    void deleteRemovesAuthAccountBeforeDeletingProfile() {
        UserProfile existing = student(1L, "DH52201258", null);
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        userService.delete(1L);

        verify(authServiceClient).deleteAccount("ADMIN", "DH52201258");
        verify(userProfileRepository).delete(existing);
    }

    @Test
    void deleteAllRemovesAuthAccountsBeforeDeletingProfiles() {
        UserProfile first = student(1L, "DH52201258", null);
        UserProfile second = student(2L, "DH52201259", null);
        when(userProfileRepository.findAllById(any())).thenReturn(List.of(first, second));

        var response = userService.deleteAll(List.of(1L, 2L));

        assertThat(response.getUpdatedCount()).isEqualTo(2);
        verify(authServiceClient).deleteAccounts("ADMIN", List.of("DH52201258", "DH52201259"));
        verify(userProfileRepository).deleteAll(List.of(first, second));
    }

    @Test
    void updateStudentGroupsCanUseClassScope() {
        StudentGroup targetGroup = group(2, "2", "Giua khoa");
        Clazz sourceClass = clazz(11L, "D22_TH05", Clazz.Status.ACTIVE);
        UserProfile student = student(3L, "DH3", sourceClass);
        BulkStudentGroupRequest request = new BulkStudentGroupRequest();
        request.setScope(BulkStudentGroupRequest.Scope.CLASS);
        request.setClassId(11L);
        request.setStudentGroupId(2);

        when(studentGroupRepository.findById(2)).thenReturn(Optional.of(targetGroup));
        when(classRepository.findById(11L)).thenReturn(Optional.of(sourceClass));
        when(userProfileRepository.findByClazzIdOrderByStudentIdAsc(11L)).thenReturn(List.of(student));
        when(userProfileRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = userService.updateStudentGroups(request);

        assertThat(student.getStudentGroup()).isSameAs(targetGroup);
        assertThat(response.getUpdatedCount()).isEqualTo(1);
        verify(userProfileRepository).saveAll(List.of(student));
    }

    @Test
    void updateFaceImageAnalyzesWithAwsThenStoresOnePublicPngPerStudent() throws Exception {
        UserProfile student = student(1L, "DH52201258", null);
        MockMultipartFile image = validFaceFile("portrait.jpg");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(student));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfile updated = userService.updateFaceImage(1L, image);
        userService.updateFaceImage(1L, validFaceFile("replacement.png"));

        Path expected = tempDir.resolve("DH52201258").resolve("DH52201258.png");
        assertThat(expected).isRegularFile();
        assertThat(updated.getFaceImagePath()).isEqualTo(expected.toAbsolutePath().toString());
        assertThat(updated.getFaceImageUrl()).isEqualTo("/faceId/DH52201258/DH52201258.png");
        assertThat(Files.list(expected.getParent()).filter(Files::isRegularFile)).hasSize(1);
        verify(faceAnalysisService, times(2)).validateSingleReferenceFace(any(byte[].class));
    }

    @Test
    void bulkFaceImportChecksStudentExistsBeforeCallingAws() throws Exception {
        MockMultipartFile existingImage = validFaceFile("DH52201258.jpg");
        MockMultipartFile missingImage = validFaceFile("DH99999999.png");
        UserProfile existing = student(1L, "DH52201258", null);
        when(userProfileRepository.findByStudentIdIgnoreCase("DH52201258")).thenReturn(Optional.of(existing));
        when(userProfileRepository.findByStudentIdIgnoreCase("DH99999999")).thenReturn(Optional.empty());
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = userService.importFaceImages(List.of(existingImage, missingImage));

        assertThat(response.getSucceeded()).isEqualTo(1);
        assertThat(response.getFailed()).isEqualTo(1);
        assertThat(response.getItems()).filteredOn(item -> !item.isSuccess())
                .singleElement().extracting("message").asString().contains("không tồn tại");
        verify(faceAnalysisService).validateSingleReferenceFace(any(byte[].class));
    }

    @Test
    void bulkFaceImportReportsProgressAfterEveryProcessedFile() throws Exception {
        MockMultipartFile existingImage = validFaceFile("DH52201258.jpg");
        MockMultipartFile missingImage = validFaceFile("DH99999999.png");
        UserProfile existing = student(1L, "DH52201258", null);
        when(userProfileRepository.findByStudentIdIgnoreCase("DH52201258")).thenReturn(Optional.of(existing));
        when(userProfileRepository.findByStudentIdIgnoreCase("DH99999999")).thenReturn(Optional.empty());
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
        List<Integer> processedCounts = new ArrayList<>();

        userService.importFaceImages(
                List.of(existingImage, missingImage),
                update -> processedCounts.add(update.getItems().size())
        );

        assertThat(processedCounts).containsExactly(1, 2);
    }

    @Test
    void bulkFaceImportDoesNotSendUnknownStudentImageToAws() throws Exception {
        MockMultipartFile missingImage = validFaceFile("DH99999999.png");
        when(userProfileRepository.findByStudentIdIgnoreCase("DH99999999")).thenReturn(Optional.empty());

        var response = userService.importFaceImages(List.of(missingImage));

        assertThat(response.getSucceeded()).isZero();
        verify(faceAnalysisService, never()).validateSingleReferenceFace(any(byte[].class));
    }

    @Test
    void identifyFacesReturnsMultipleDistinctFacesFromOneGroupImage() throws Exception {
        UserProfile first = student(1L, "DH52201258", null);
        UserProfile second = student(2L, "DH52201259", null);
        Path firstPath = tempDir.resolve("first.png");
        Path secondPath = tempDir.resolve("second.png");
        Files.write(firstPath, validFaceFile("first.png").getBytes());
        Files.write(secondPath, validFaceFile("second.png").getBytes());
        first.setFaceImagePath(firstPath.toString());
        second.setFaceImagePath(secondPath.toString());
        when(userProfileRepository.findAllWithFaceImagePath()).thenReturn(List.of(first, second));
        when(faceAnalysisService.compareFaces(any(byte[].class), any(byte[].class), eq(90F)))
                .thenReturn(List.of(new FaceAnalysisService.FaceMatch(99F, 0.1F, 0.1F, 0.2F, 0.2F)))
                .thenReturn(List.of(new FaceAnalysisService.FaceMatch(98F, 0.6F, 0.1F, 0.2F, 0.2F)));

        var matches = userService.identifyFaces(validFaceFile("group.jpg"), List.of());

        assertThat(matches).extracting("studentId")
                .containsExactly("DH52201258", "DH52201259");
    }

    @Test
    void identifyFacesKeepsOnlyBestStudentForSameTargetBoundingBox() throws Exception {
        UserProfile first = student(1L, "DH52201258", null);
        UserProfile second = student(2L, "DH52201259", null);
        Path firstPath = tempDir.resolve("first.png");
        Path secondPath = tempDir.resolve("second.png");
        Files.write(firstPath, validFaceFile("first.png").getBytes());
        Files.write(secondPath, validFaceFile("second.png").getBytes());
        first.setFaceImagePath(firstPath.toString());
        second.setFaceImagePath(secondPath.toString());
        when(userProfileRepository.findAllWithFaceImagePath()).thenReturn(List.of(first, second));
        when(faceAnalysisService.compareFaces(any(byte[].class), any(byte[].class), eq(90F)))
                .thenReturn(List.of(new FaceAnalysisService.FaceMatch(99F, 0.1F, 0.1F, 0.2F, 0.2F)))
                .thenReturn(List.of(new FaceAnalysisService.FaceMatch(95F, 0.11F, 0.11F, 0.2F, 0.2F)));

        var matches = userService.identifyFaces(validFaceFile("group.jpg"), List.of());

        assertThat(matches).singleElement().extracting("studentId").isEqualTo("DH52201258");
    }

    private MockMultipartFile validFaceFile(String fileName) throws Exception {
        BufferedImage image = new BufferedImage(300, 300, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        String format = fileName.toLowerCase().endsWith(".png") ? "png" : "jpg";
        ImageIO.write(image, format, output);
        String contentType = format.equals("png") ? "image/png" : "image/jpeg";
        return new MockMultipartFile("files", fileName, contentType, output.toByteArray());
    }

    private StudentGroup group(Integer id, String code, String name) {
        StudentGroup group = new StudentGroup();
        group.setId(id);
        group.setCode(code);
        group.setName(name);
        return group;
    }

    private Clazz clazz(Long id, String classCode, Clazz.Status status) {
        Clazz clazz = new Clazz();
        clazz.setId(id);
        clazz.setClassCode(classCode);
        clazz.setStatus(status);
        return clazz;
    }

    private UserProfile student(Long id, String studentId, Clazz clazz) {
        UserProfile student = new UserProfile();
        student.setId(id);
        student.setStudentId(studentId);
        student.setFullName("Student " + studentId);
        student.setClazz(clazz);
        student.setStudentStatus(UserProfile.StudentStatus.STUDYING);
        return student;
    }
}
