package com.certificationservice.repository;

import com.certificationservice.domain.FormType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormTypeRepository extends JpaRepository<FormType, Long> {
    List<FormType> findByIsActiveTrue();
    boolean existsByNameAndIdNot(String name, Long id);
    boolean existsByName(String name);
}
