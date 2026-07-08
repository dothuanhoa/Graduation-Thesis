package com.activityservice.repository;

import com.activityservice.domain.ActivityChecker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ActivityCheckerRepository extends JpaRepository<ActivityChecker, Long> {
    List<ActivityChecker> findByActivityIdOrderByCheckerCodeAsc(Long activityId);
    @Query("select c from ActivityChecker c join fetch c.activity where lower(c.checkerTsid) = lower(:checkerCode) or lower(c.checkerCode) = lower(:checkerCode)")
    List<ActivityChecker> findByCheckerCodeOrTsid(@Param("checkerCode") String checkerCode);
    boolean existsByActivityIdAndCheckerTsidIgnoreCase(Long activityId, String checkerTsid);
    boolean existsByActivityIdAndCheckerCodeIgnoreCase(Long activityId, String checkerCode);
    boolean existsByActivityIdAndCheckerTsidIgnoreCaseOrActivityIdAndCheckerCodeIgnoreCase(
            Long activityIdForTsid,
            String checkerTsid,
            Long activityIdForCode,
            String checkerCode
    );
    Optional<ActivityChecker> findByActivityIdAndCheckerTsidIgnoreCase(Long activityId, String checkerTsid);
    long countByActivityId(Long activityId);
}
