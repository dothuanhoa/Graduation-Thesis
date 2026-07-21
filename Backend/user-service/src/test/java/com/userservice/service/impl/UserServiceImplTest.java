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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private ClassRepository classRepository;
    @Mock private AcademicYearRepository academicYearRepository;
    @Mock private StudentGroupRepository studentGroupRepository;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private OrganizationService organizationService;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(
                userProfileRepository,
                classRepository,
                academicYearRepository,
                studentGroupRepository,
                authServiceClient,
                organizationService
        );
        ReflectionTestUtils.setField(userService, "studentEmailDomain", "student.edu.vn");
    }

    @Test
    void saveCreatesDefaultEmailAndInitialAuthAccount() {
        StudentGroup defaultGroup = group(1, "1", "Dau khoa");
        UserProfile profile = new UserProfile();
        profile.setStudentId("DH52201258");
        profile.setFullName("Tran Thanh Hoai Phuc");
        profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        when(studentGroupRepository.findByCode("1")).thenReturn(Optional.of(defaultGroup));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfile saved = userService.save(profile);

        assertThat(saved.getEmail()).isEqualTo("dh52201258@student.edu.vn");
        assertThat(saved.getStudentGroup()).isSameAs(defaultGroup);
        ArgumentCaptor<AuthServiceClient.RegisterRequest> requestCaptor = ArgumentCaptor.forClass(AuthServiceClient.RegisterRequest.class);
        verify(authServiceClient).registerAccount(eq(true), requestCaptor.capture());
        assertThat(requestCaptor.getValue().getUsername()).isEqualTo("DH52201258");
        assertThat(requestCaptor.getValue().getEmail()).isEqualTo("dh52201258@student.edu.vn");
    }

    @Test
    void saveCanSkipInitialAuthEmail() {
        StudentGroup defaultGroup = group(1, "1", "Dau khoa");
        UserProfile profile = new UserProfile();
        profile.setStudentId("DH52201258");
        profile.setFullName("Tran Thanh Hoai Phuc");
        profile.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        when(studentGroupRepository.findByCode("1")).thenReturn(Optional.of(defaultGroup));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.save(profile, false);

        ArgumentCaptor<AuthServiceClient.RegisterRequest> requestCaptor = ArgumentCaptor.forClass(AuthServiceClient.RegisterRequest.class);
        verify(authServiceClient).registerAccount(eq(false), requestCaptor.capture());
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
        UserProfile existing = student(1L, "DH52201258", null);
        existing.setEmail("old@student.edu.vn");
        existing.setStudentGroup(currentGroup);
        existing.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        UserProfile request = new UserProfile();
        request.setStudentId("DH52201258");
        request.setFullName("Tran Thanh Hoai Phuc");
        request.setEmail("NEW@student.edu.vn");
        request.setStudentStatus(UserProfile.StudentStatus.STUDYING);

        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));
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
