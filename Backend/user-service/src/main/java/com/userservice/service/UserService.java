package com.userservice.service;

import com.userservice.domain.UserProfile;
import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

public interface UserService {
    List<UserProfile> findAll();
    Optional<UserProfile> findById(Long id);
    Optional<UserProfile> findByStudentId(String studentId);
    UserProfile save(UserProfile userProfile);
    UserProfile update(Long id, UserProfile userProfile);
    void delete(Long id);
    String bulkImport(List<StudentImportRow> rows);
    String bulkImport(List<StudentImportRow> rows, Consumer<StudentImportProgress> progressConsumer);
    UserProfile updateContactByStudentId(String studentId, String contactPhone);
}
