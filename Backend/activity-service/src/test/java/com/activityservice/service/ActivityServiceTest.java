package com.activityservice.service;

import com.activityservice.client.UserClient;
import com.activityservice.domain.Activity;
import com.activityservice.domain.ActivityRegistration;
import com.activityservice.dto.ActivityRequest;
import com.activityservice.dto.CheckinRequest;
import com.activityservice.dto.RegistrationRequest;
import com.activityservice.dto.UserProfileDTO;
import com.activityservice.exception.BadRequestException;
import com.activityservice.repository.ActivityCheckerRepository;
import com.activityservice.repository.ActivityRegistrationRepository;
import com.activityservice.repository.ActivityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
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
    void createOpenActivityClearsCapacityAndGoogleForm() {
        ActivityRequest request = validActivityRequest(Activity.ParticipationType.OPEN);
        request.setGoogleFormUrl("https://forms.gle/test");
        request.setCapacity(50);
        when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> {
            Activity activity = invocation.getArgument(0);
            activity.setId(1L);
            return activity;
        });

        var response = service.create(request, "admin");

        assertThat(response.getParticipationType()).isEqualTo(Activity.ParticipationType.OPEN);
        assertThat(response.getGoogleFormUrl()).isEmpty();
        assertThat(response.getCapacity()).isNull();
    }

    @Test
    void manualRegistrationIsRejectedForOpenActivity() {
        Activity activity = activity(1L, Activity.ParticipationType.OPEN, Activity.Status.UPCOMING);
        RegistrationRequest request = new RegistrationRequest();
        request.setStudentCode("DH52201258");
        request.setFullName("Tran Thanh Hoai Phuc");
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));

        assertThatThrownBy(() -> service.addRegistration(1L, request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void openActivityCheckinCreatesRegistrationForExistingStudent() {
        Activity activity = activity(1L, Activity.ParticipationType.OPEN, Activity.Status.ONGOING);
        CheckinRequest request = new CheckinRequest();
        request.setStudentCode("DH52201258");
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));
        when(checkerRepository.existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(1L, "CHECKER1", 1L, "CHECKER1"))
                .thenReturn(true);
        when(registrationRepository.findByActivityIdAndStudentCodeIgnoreCase(1L, "DH52201258")).thenReturn(Optional.empty());
        when(userClient.getStudentProfile("SYSTEM", "activity-service", "DH52201258"))
                .thenReturn(profile("DH52201258", "Tran Thanh Hoai Phuc"));
        when(registrationRepository.save(any(ActivityRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.checkin(1L, "CHECKER1", request);

        assertThat(response.isAttended()).isTrue();
        assertThat(response.getStudentCode()).isEqualTo("DH52201258");
        ArgumentCaptor<ActivityRegistration> registrationCaptor = ArgumentCaptor.forClass(ActivityRegistration.class);
        verify(registrationRepository, times(2)).save(registrationCaptor.capture());
        assertThat(registrationCaptor.getAllValues().get(0).getFullName()).isEqualTo("Tran Thanh Hoai Phuc");
        assertThat(registrationCaptor.getAllValues().get(1).isAttended()).isTrue();
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

    private UserProfileDTO profile(String studentId, String fullName) {
        UserProfileDTO profile = new UserProfileDTO();
        profile.setStudentId(studentId);
        profile.setFullName(fullName);
        return profile;
    }
}
