package com.certificationservice.repository;

import com.certificationservice.domain.FormType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FormTypeRepository extends JpaRepository<FormType, Long> {
    List<FormType> findByIsActiveTrue();
    List<FormType> findByIsActiveTrueAndFormCodeIn(Collection<String> formCodes);
    Optional<FormType> findByFormCode(String formCode);
    Optional<FormType> findByName(String name);
    boolean existsByNameAndIdNot(String name, Long id);
    boolean existsByName(String name);
}
