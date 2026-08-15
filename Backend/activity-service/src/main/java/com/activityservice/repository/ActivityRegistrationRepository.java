package com.activityservice.repository;

import com.activityservice.domain.ActivityRegistration;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ActivityRegistrationRepository extends JpaRepository<ActivityRegistration, Long> {
    @EntityGraph(attributePaths = "activity")
    List<ActivityRegistration> findByActivityIdOrderByStudentCodeAsc(Long activityId);

    Optional<ActivityRegistration> findByActivityIdAndStudentCodeIgnoreCase(Long activityId, String studentCode);
    boolean existsByActivityIdAndStudentCodeIgnoreCase(Long activityId, String studentCode);
    boolean existsByActivityIdAndUserTsidIgnoreCase(Long activityId, String userTsid);
    long countByActivityId(Long activityId);
    long countByActivityIdAndAttendedTrue(Long activityId);
    long countByActivityIdAndFaceVerifiedTrue(Long activityId);

    @EntityGraph(attributePaths = "activity")
    @Query("""
            select registration
            from ActivityRegistration registration
            join registration.activity activity
            where lower(registration.studentCode) = lower(:studentCode)
            order by activity.startTime desc, activity.createdAt desc
            """)
    List<ActivityRegistration> findHistoryByStudentCode(@Param("studentCode") String studentCode);
}
