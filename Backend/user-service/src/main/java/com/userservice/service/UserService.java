package com.userservice.service;

import com.userservice.domain.UserProfile;
import com.userservice.domain.StudentGroup;
import com.userservice.dto.BulkStudentGroupRequest;
import com.userservice.dto.BulkStudentUpdateResponse;
import com.userservice.dto.StudentImportProgress;
import com.userservice.dto.StudentImportRow;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

public interface UserService {
    List<UserProfile> findAll();
    Optional<UserProfile> findById(Long id);
    Optional<UserProfile> findByStudentId(String studentId);
    List<StudentGroup> findAllStudentGroups();
    UserProfile save(UserProfile userProfile);
    UserProfile save(UserProfile userProfile, boolean sendMail);
    UserProfile update(Long id, UserProfile userProfile);
    void delete(Long id);
    String bulkImport(List<StudentImportRow> rows);
    String bulkImport(List<StudentImportRow> rows, boolean sendMail);
    String bulkImport(List<StudentImportRow> rows, Consumer<StudentImportProgress> progressConsumer);
    String bulkImport(List<StudentImportRow> rows, Consumer<StudentImportProgress> progressConsumer, boolean sendMail);
    BulkStudentUpdateResponse assignStudentsToClass(List<Long> studentIds, Long classId);
    BulkStudentUpdateResponse updateStudentStatuses(List<Long> studentIds, UserProfile.StudentStatus status);
    BulkStudentUpdateResponse updateStudentGroups(BulkStudentGroupRequest request);
    UserProfile updateContactByStudentId(String studentId, String contactPhone);
}
