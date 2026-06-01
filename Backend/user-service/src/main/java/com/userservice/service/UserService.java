package com.userservice.service;

import com.userservice.domain.User;

import java.util.List;
import java.util.Optional;

public interface UserService {
    List<User> findAll();
    Optional<User> findById(long id);
    Optional<User> findByStudentCode(String studentCode);
    User save(User user);
    User update(long id, User user);
    void delete(long id);
}
