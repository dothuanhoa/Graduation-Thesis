package com.userservice.service.impl;

import com.userservice.domain.User;
import com.userservice.repository.UserRepository;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;

    public List<User> findAll(){
        return userRepository.findAll();
    }

    public Optional<User> findById(long id){
        return userRepository.findById(id);
    }

    public Optional<User> findByStudentCode(String studentCode){
        return userRepository.findByStudentCode(studentCode);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public User update(long id, User userDetails) {
        return userRepository.findById(id).map(user -> {
            user.setFullName(userDetails.getFullName());
            user.setStudentCode(userDetails.getStudentCode());
            user.setEmail(userDetails.getEmail());
            return userRepository.save(user);
        }).orElseThrow(() -> new com.userservice.exception.ResourceNotFoundException("Không tìm thấy User với id: " + id));
    }

    public void delete(long id) {
        if (!userRepository.existsById(id)) {
            throw new com.userservice.exception.ResourceNotFoundException("Không tìm thấy User với id: " + id);
        }
        userRepository.deleteById(id);
    }
}
