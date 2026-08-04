package com.activityservice.service;

import com.activityservice.client.UserClient;
import com.activityservice.domain.Activity;
import com.activityservice.domain.ActivityRegistration;
import com.activityservice.dto.ActivityRequest;
import com.activityservice.dto.CheckinRequest;
import com.activityservice.dto.FaceVerificationResponse;
import com.activityservice.dto.QrCheckinRequest;
import com.activityservice.dto.QrSessionRequest;
import com.activityservice.dto.UserProfileDTO;
import com.activityservice.exception.BadRequestException;
import com.activityservice.exception.ResourceNotFoundException;
import com.activityservice.repository.ActivityCheckerRepository;
import com.activityservice.repository.ActivityRegistrationRepository;
import com.activityservice.repository.ActivityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {
    @Mock private ActivityRepository activityRepository;
    @Mock private ActivityRegistrationRepository registrationRepository;
    @Mock private ActivityCheckerRepository checkerRepository;
    @Mock private UserClient userClient;

    private ActivityService service;

    @BeforeEach
    void setUp() {
        service = new ActivityService(activityRepository, registrationRepository, checkerRepository, userClient);
    }

    @Test
    void createOpenActivityClearsRegistrationFieldsAndUsesSingleFaceSession() {
        ActivityRequest request = validActivityRequest(Activity.ParticipationType.OPEN);
        request.setGoogleFormUrl("https://forms.gle/test");
        request.setCapacity(50);
        request.setRegistrationStartTime(LocalDateTime.now().plusHours(1));
        request.setRegistrationEndTime(LocalDateTime.now().plusHours(2));
        request.setAttendanceSessionCount(3);
        when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> {
            Activity activity = invocation.getArgument(0);
            activity.setId(1L);
            return activity;
        });

        var response = service.create(request, "admin");

        assertThat(response.getParticipationType()).isEqualTo(Activity.ParticipationType.OPEN);
        assertThat(response.getAttendanceSessionCount()).isEqualTo(1);
        assertThat(response.getGoogleFormUrl()).isEmpty();
        assertThat(response.getCapacity()).isNull();
        assertThat(response.getRegistrationStartTime()).isNull();
        assertThat(response.getRegistrationEndTime()).isNull();
    }

    @Test
    void selfRegistrationLocksActivityAndSavesLoggedInStudent() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.UPCOMING);
        activity.setCapacity(10);
        activity.setRegistrationStartTime(LocalDateTime.now().minusMinutes(5));
        activity.setRegistrationEndTime(LocalDateTime.now().plusMinutes(30));
        when(activityRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activity));
        when(userClient.getStudentProfile("SYSTEM", "activity-service", "DH52201258"))
                .thenReturn(profile("DH52201258", "Tran Thanh Hoai Phuc"));
        when(registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258")).thenReturn(false);
        when(registrationRepository.existsByActivityIdAndUserTsidIgnoreCase(1L, "1001")).thenReturn(false);
        when(registrationRepository.countByActivityId(1L)).thenReturn(0L);
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.registerMe(1L, "DH52201258");

        assertThat(response.getStudentCode()).isEqualTo("DH52201258");
        assertThat(response.getUserTsid()).isEqualTo("1001");
        assertThat(response.getFullName()).isEqualTo("Tran Thanh Hoai Phuc");
        verify(activityRepository).findByIdForUpdate(1L);
    }

    @Test
    void selfRegistrationRejectsWhenActivityIsFull() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.UPCOMING);
        activity.setCapacity(1);
        activity.setRegistrationStartTime(LocalDateTime.now().minusMinutes(5));
        activity.setRegistrationEndTime(LocalDateTime.now().plusMinutes(30));
        when(activityRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activity));
        when(userClient.getStudentProfile("SYSTEM", "activity-service", "DH52201258"))
                .thenReturn(profile("DH52201258", "Tran Thanh Hoai Phuc"));
        when(registrationRepository.existsByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258")).thenReturn(false);
        when(registrationRepository.existsByActivityIdAndUserTsidIgnoreCase(1L, "1001")).thenReturn(false);
        when(registrationRepository.countByActivityId(1L)).thenReturn(1L);

        assertThatThrownBy(() -> service.registerMe(1L, "DH52201258"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đủ số lượng");
    }

    @Test
    void manualCodeCheckinIsRejectedBecauseEntryAttendanceUsesFaceVerification() {
        CheckinRequest request = new CheckinRequest();
        request.setStudentCode("DH52201258");

        assertThatThrownBy(() -> service.checkin(1L, "CHECKER1", request))
                .isInstanceOf(BadRequestException.class);
        verify(registrationRepository, never()).save(any(ActivityRegistration.class));
    }

    @Test
    void openActivityFaceCheckinCreatesAttendanceWithoutRegistrationList() {
        Activity activity = activity(1L, Activity.ParticipationType.OPEN, Activity.Status.ONGOING);
        MockMultipartFile faceImage = new MockMultipartFile("file", "face.jpg", "image/jpeg", "fake".getBytes());
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(1L, "CHECKER1", 1L, "CHECKER1"))
                .thenReturn(true);
        when(userClient.identifyStudentFace("SYSTEM", "activity-service", "", faceImage))
                .thenReturn(verifiedFace());
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258")).thenReturn(Optional.empty());
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.faceCheckin(1L, "STUDENT", "CHECKER1", faceImage);

        assertThat(response.getStudentCode()).isEqualTo("DH52201258");
        assertThat(response.getUserTsid()).isEqualTo("1001");
        assertThat(response.isFaceVerified()).isTrue();
        assertThat(response.isAttended()).isTrue();
        assertThat(response.getCheckinTime()).isNotNull();
        assertThat(response.getAttendanceResult()).isEqualTo(ActivityRegistration.AttendanceResult.ATTENDED);
    }

    @Test
    void faceCheckinRejectsDuplicateAndKeepsFirstCheckinTime() {
        Activity activity = activity(1L, Activity.ParticipationType.OPEN, Activity.Status.ONGOING);
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        LocalDateTime firstCheckinTime = LocalDateTime.now().minusMinutes(20);
        registration.setFaceVerified(true);
        registration.setFaceVerifiedTime(firstCheckinTime);
        registration.setCheckinTime(firstCheckinTime);
        MockMultipartFile faceImage = new MockMultipartFile("file", "face.jpg", "image/jpeg", "fake".getBytes());

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(1L, "CHECKER1", 1L, "CHECKER1"))
                .thenReturn(true);
        when(userClient.identifyStudentFace("SYSTEM", "activity-service", "", faceImage))
                .thenReturn(verifiedFace());
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));

        assertThatThrownBy(() -> service.faceCheckin(1L, "STUDENT", "CHECKER1", faceImage))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("da diem danh");
        assertThat(registration.getCheckinTime()).isEqualTo(firstCheckinTime);
        verify(registrationRepository, never()).save(any(ActivityRegistration.class));
    }

    @Test
    void faceCheckinNormalizesOldUserTsidToProfileIdOnFirstSuccessfulCheckin() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        registration.setUserTsid("DH52201258");
        MockMultipartFile faceImage = new MockMultipartFile("file", "face.jpg", "image/jpeg", "fake".getBytes());

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(1L, "CHECKER1", 1L, "CHECKER1"))
                .thenReturn(true);
        when(registrationRepository.findByActivityIdOrderByStudentCodeAsc(1L)).thenReturn(List.of(registration));
        when(userClient.identifyStudentFace("SYSTEM", "activity-service", "DH52201258", faceImage))
                .thenReturn(verifiedFace());
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.faceCheckin(1L, "STUDENT", "CHECKER1", faceImage);

        assertThat(response.getUserTsid()).isEqualTo("1001");
        assertThat(registration.getUserTsid()).isEqualTo("1001");
        assertThat(response.getCheckinTime()).isNotNull();
    }

    @Test
    void limitedActivityFaceCheckinRejectsStudentNotInRegistrationList() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        MockMultipartFile faceImage = new MockMultipartFile("file", "face.jpg", "image/jpeg", "fake".getBytes());
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(1L, "CHECKER1", 1L, "CHECKER1"))
                .thenReturn(true);
        ActivityRegistration otherRegistration = registration(activity, "DH52209999", "Nguyen Van A");
        when(registrationRepository.findByActivityIdOrderByStudentCodeAsc(1L)).thenReturn(List.of(otherRegistration));
        when(userClient.identifyStudentFace("SYSTEM", "activity-service", "DH52209999", faceImage))
                .thenReturn(verifiedFace());
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.faceCheckin(1L, "STUDENT", "CHECKER1", faceImage))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(registrationRepository, never()).save(any(ActivityRegistration.class));
    }

    @Test
    void createQrSessionStoresLocationPolicyWhenRequired() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        QrSessionRequest request = new QrSessionRequest();
        request.setSession(Activity.AttendanceSession.FINAL);
        request.setExpiresInMinutes(10);
        request.setLocationRequired(true);
        request.setLatitude(10.738123);
        request.setLongitude(106.677456);
        request.setAccuracyMeters(25D);
        request.setAllowedRadiusMeters(100);

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.createQrSession(1L, request);

        assertThat(response.getSession()).isEqualTo(Activity.AttendanceSession.FINAL);
        assertThat(response.isLocationRequired()).isTrue();
        assertThat(response.getAllowedRadiusMeters()).isEqualTo(100);
        assertThat(activity.isFinalQrLocationRequired()).isTrue();
        assertThat(activity.getFinalQrLatitude()).isEqualTo(10.738123);
        assertThat(activity.getFinalQrLongitude()).isEqualTo(106.677456);
    }

    @Test
    void qrCheckinByPayloadResolvesActivityAndRequiresFaceVerificationForCompleteAttendance() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        activity.setAttendanceSessionCount(2);
        activity.setFinalQrCode("final-code");
        activity.setFinalQrExpiresAt(LocalDateTime.now().plusMinutes(10));

        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        QrCheckinRequest request = new QrCheckinRequest();
        request.setQrCode("ACTIVITY_QR:1:FINAL:final-code");

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.qrCheckin("DH52201258", request);

        assertThat(response.isFinalAttended()).isTrue();
        assertThat(response.isAttended()).isFalse();
        assertThat(response.getCheckinTime()).isNull();
        assertThat(response.getAttendanceResult()).isEqualTo(ActivityRegistration.AttendanceResult.FACE_NOT_VERIFIED);
    }

    @Test
    void qrCheckinRejectsMissingLocationWhenQrRequiresLocation() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        activity.setAttendanceSessionCount(2);
        configureFinalQrLocation(activity);
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        QrCheckinRequest request = new QrCheckinRequest();
        request.setQrCode("ACTIVITY_QR:1:FINAL:final-code");

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));

        assertThatThrownBy(() -> service.qrCheckin("DH52201258", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không lấy được vị trí hiện tại");
        assertThat(registration.isFinalAttended()).isFalse();
        verify(registrationRepository, never()).save(any(ActivityRegistration.class));
    }

    @Test
    void qrCheckinRejectsWhenStudentIsOutsideAllowedRadius() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        activity.setAttendanceSessionCount(2);
        configureFinalQrLocation(activity);
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        QrCheckinRequest request = qrRequestNearFinal("ACTIVITY_QR:1:FINAL:final-code", 10.748123, 106.687456);

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));

        assertThatThrownBy(() -> service.qrCheckin("DH52201258", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ngoài phạm vi điểm danh");
        assertThat(registration.isFinalAttended()).isFalse();
        verify(registrationRepository, never()).save(any(ActivityRegistration.class));
    }

    @Test
    void qrCheckinStoresLocationEvidenceWhenStudentIsInsideAllowedRadius() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        activity.setAttendanceSessionCount(2);
        configureFinalQrLocation(activity);
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        LocalDateTime firstFaceCheckinTime = LocalDateTime.now().minusMinutes(30);
        registration.setFaceVerified(true);
        registration.setFaceVerifiedTime(firstFaceCheckinTime);
        registration.setCheckinTime(firstFaceCheckinTime);
        QrCheckinRequest request = qrRequestNearFinal("ACTIVITY_QR:1:FINAL:final-code", 10.738223, 106.677556);

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.qrCheckin("DH52201258", request);

        assertThat(response.isFinalAttended()).isTrue();
        assertThat(response.isFinalLocationVerified()).isTrue();
        assertThat(response.getFinalDistanceMeters()).isLessThan(100D);
        assertThat(response.getCheckinTime()).isEqualTo(firstFaceCheckinTime);
    }

    @Test
    void qrCheckinDoesNotChangeFirstFaceCheckinTime() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        activity.setAttendanceSessionCount(2);
        activity.setFinalQrCode("final-code");
        activity.setFinalQrExpiresAt(LocalDateTime.now().plusMinutes(10));
        LocalDateTime firstFaceCheckinTime = LocalDateTime.now().minusMinutes(30);
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        registration.setFaceVerified(true);
        registration.setFaceVerifiedTime(firstFaceCheckinTime);
        registration.setCheckinTime(firstFaceCheckinTime);
        QrCheckinRequest request = new QrCheckinRequest();
        request.setQrCode("ACTIVITY_QR:1:FINAL:final-code");

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.qrCheckin("DH52201258", request);

        assertThat(response.isFinalAttended()).isTrue();
        assertThat(response.isAttended()).isTrue();
        assertThat(response.getCheckinTime()).isEqualTo(firstFaceCheckinTime);
        assertThat(response.getFinalCheckinTime()).isNotNull();
    }

    @Test
    void qrCheckinRejectsDuplicateFinalSessionAndKeepsTime() {
        Activity activity = activity(1L, Activity.ParticipationType.LIMITED, Activity.Status.ONGOING);
        activity.setAttendanceSessionCount(2);
        activity.setFinalQrCode("final-code");
        activity.setFinalQrExpiresAt(LocalDateTime.now().plusMinutes(10));
        ActivityRegistration registration = registration(activity, "DH52201258", "Tran Thanh Hoai Phuc");
        LocalDateTime firstFaceCheckinTime = LocalDateTime.now().minusMinutes(30);
        LocalDateTime firstFinalCheckinTime = LocalDateTime.now().minusMinutes(5);
        registration.setFaceVerified(true);
        registration.setFaceVerifiedTime(firstFaceCheckinTime);
        registration.setCheckinTime(firstFaceCheckinTime);
        registration.setFinalAttended(true);
        registration.setFinalCheckinTime(firstFinalCheckinTime);
        QrCheckinRequest request = new QrCheckinRequest();
        request.setQrCode("ACTIVITY_QR:1:FINAL:final-code");

        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258"))
                .thenReturn(Optional.of(registration));

        assertThatThrownBy(() -> service.qrCheckin("DH52201258", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("da diem danh");
        assertThat(registration.getCheckinTime()).isEqualTo(firstFaceCheckinTime);
        assertThat(registration.getFinalCheckinTime()).isEqualTo(firstFinalCheckinTime);
        verify(registrationRepository, never()).save(any(ActivityRegistration.class));
    }

    private void configureFinalQrLocation(Activity activity) {
        activity.setFinalQrCode("final-code");
        activity.setFinalQrExpiresAt(LocalDateTime.now().plusMinutes(10));
        activity.setFinalQrLocationRequired(true);
        activity.setFinalQrLatitude(10.738123);
        activity.setFinalQrLongitude(106.677456);
        activity.setFinalQrAllowedRadiusMeters(100);
    }

    private QrCheckinRequest qrRequestNearFinal(String qrCode, double latitude, double longitude) {
        QrCheckinRequest request = new QrCheckinRequest();
        request.setQrCode(qrCode);
        request.setLatitude(latitude);
        request.setLongitude(longitude);
        request.setAccuracyMeters(20D);
        return request;
    }

    private ActivityRequest validActivityRequest(Activity.ParticipationType participationType) {
        ActivityRequest request = new ActivityRequest();
        request.setTitle("Workshop ky nang");
        request.setCategory(Activity.Category.UNIVERSITY);
        request.setReward("+5");
        request.setParticipationType(participationType);
        request.setLocation("Hoi truong");
        request.setStartTime(LocalDateTime.now().plusDays(1));
        request.setEndTime(LocalDateTime.now().plusDays(2));
        if (participationType == Activity.ParticipationType.LIMITED) {
            request.setGoogleFormUrl("https://forms.gle/test");
            request.setCapacity(100);
            request.setRegistrationStartTime(LocalDateTime.now().plusHours(1));
            request.setRegistrationEndTime(LocalDateTime.now().plusHours(2));
        }
        return request;
    }

    private Activity activity(Long id, Activity.ParticipationType participationType, Activity.Status status) {
        Activity activity = new Activity();
        activity.setId(id);
        activity.setTitle("Activity");
        activity.setCategory(Activity.Category.UNIVERSITY);
        activity.setReward("+5");
        activity.setParticipationType(participationType);
        activity.setStatus(status);
        activity.setStartTime(LocalDateTime.now().minusHours(1));
        activity.setEndTime(LocalDateTime.now().plusHours(1));
        activity.setCreatedBy("admin");
        return activity;
    }

    private ActivityRegistration registration(Activity activity, String studentCode, String fullName) {
        ActivityRegistration registration = new ActivityRegistration();
        registration.setActivity(activity);
        registration.setStudentCode(studentCode);
        registration.setFullName(fullName);
        registration.setUserTsid("1001");
        return registration;
    }

    private UserProfileDTO profile(String studentId, String fullName) {
        UserProfileDTO profile = new UserProfileDTO();
        profile.setId(1001L);
        profile.setStudentId(studentId);
        profile.setFullName(fullName);
        return profile;
    }

    private FaceVerificationResponse verifiedFace() {
        FaceVerificationResponse response = new FaceVerificationResponse();
        response.setVerified(true);
        response.setUserId(1001L);
        response.setStudentId("DH52201258");
        response.setFullName("Tran Thanh Hoai Phuc");
        response.setSimilarity(99F);
        response.setThreshold(80F);
        return response;
    }
}
