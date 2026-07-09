package com.userservice.service.impl;

import com.userservice.client.AuthServiceClient;
import com.userservice.domain.UserProfile;
import com.userservice.repository.UserProfileRepository;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserProfileRepository userProfileRepository;
    private final AuthServiceClient authServiceClient;

    public List<UserProfile> findAll(){
        return userProfileRepository.findAll();
    }

    public Optional<UserProfile> findById(Long id){
        return userProfileRepository.findById(id);
    }

    public Optional<UserProfile> findByStudentId(String studentId) {
        return userProfileRepository.findByStudentId(studentId);
    }

    @Transactional
    public UserProfile save(UserProfile userProfile) {
        // Lưu hồ sơ sinh viên
        UserProfile savedProfile = userProfileRepository.save(userProfile);
        
        // Tạo email theo chuẩn trường
        String studentEmail = savedProfile.getStudentId() + "@student.stu.edu.vn";
        
        // Gọi API nội bộ sang auth-service để tự động tạo tài khoản (mật khẩu random, status REQUIRE_CHANGE_PWD)
        authServiceClient.registerAccount(new AuthServiceClient.RegisterRequest(
                savedProfile.getStudentId(),
                studentEmail
        ));

        return savedProfile;
    }

    @Transactional
    public String bulkImport(List<UserProfile> profiles) {
        // Lệnh saveAll này sẽ tự động được Hibernate gộp thành Batch Insert (ví dụ 100 row/lần)
        List<UserProfile> savedProfiles = userProfileRepository.saveAll(profiles);

        // Chuẩn bị accounts để gọi Feign
        List<com.userservice.dto.BulkRegisterMessage.UserAccountDTO> accounts = savedProfiles.stream().map(p -> {
            return new com.userservice.dto.BulkRegisterMessage.UserAccountDTO(
                    p.getStudentId(),
                    p.getStudentId() + "@student.stu.edu.vn"
            );
        }).toList();

        // Gửi qua API thay vì RabbitMQ
        authServiceClient.bulkRegisterAccount(accounts);

        return "Đã import thành công " + savedProfiles.size() + " hồ sơ sinh viên và đã tạo tài khoản ngầm.";
    }

    public UserProfile update(Long id, UserProfile userDetails) {
        return userProfileRepository.findById(id).map(user -> {
            user.setFullName(userDetails.getFullName());
            user.setStudentId(userDetails.getStudentId());
            user.setDob(userDetails.getDob());
            user.setGender(userDetails.getGender());
            user.setContactPhone(userDetails.getContactPhone());
            user.setStudentStatus(userDetails.getStudentStatus());
            return userProfileRepository.save(user);
        }).orElseThrow(() -> new com.userservice.exception.ResourceNotFoundException("Không tìm thấy UserProfile với id: " + id));
    }

    public void delete(Long id) {
        if (!userProfileRepository.existsById(id)) {
            throw new com.userservice.exception.ResourceNotFoundException("Không tìm thấy UserProfile với id: " + id);
        }
        userProfileRepository.deleteById(id);
    }

    @Transactional
    public UserProfile updateContactByStudentId(String studentId, String contactPhone) {
        UserProfile user = userProfileRepository.findByStudentId(studentId)
                .orElseThrow(() -> new com.userservice.exception.ResourceNotFoundException("Không tìm thấy UserProfile với studentId: " + studentId));
        
        user.setContactPhone(contactPhone);
        return userProfileRepository.save(user);
    }
}
