package com.activityservice.repository;

import com.activityservice.domain.ActivityRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActivityRegistrationRepository extends JpaRepository<ActivityRegistration, Long> {
    List<ActivityRegistration> findByActivityIdOrderByStudentCodeAsc(Long activityId);
    Optional<ActivityRegistration> findByActivityIdAndStudentCodeIgnoreCase(Long activityId, String studentCode);
    boolean existsByActivityIdAndStudentCodeIgnoreCase(Long activityId, String studentCode);
    boolean existsByActivityIdAndUserTsidIgnoreCase(Long activityId, String userTsid);
    long countByActivityId(Long activityId);
    long countByActivityIdAndAttendedTrue(Long activityId);
}
