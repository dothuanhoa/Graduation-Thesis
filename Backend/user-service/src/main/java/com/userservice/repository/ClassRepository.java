package com.userservice.repository;

import com.userservice.domain.Clazz;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassRepository extends JpaRepository<Clazz, Long> {
}
