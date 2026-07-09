package com.userservice.service;

import com.userservice.domain.UserProfile;

import java.util.List;
import java.util.Optional;

public interface UserService {
    List<UserProfile> findAll();
    Optional<UserProfile> findById(Long id);
    Optional<UserProfile> findByStudentId(String studentId);
    UserProfile save(UserProfile userProfile);
    UserProfile update(Long id, UserProfile userProfile);
    void delete(Long id);
    String bulkImport(List<UserProfile> profiles);
    UserProfile updateContactByStudentId(String studentId, String contactPhone);
}
