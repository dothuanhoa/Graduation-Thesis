package com.userservice.service.impl;

import com.userservice.client.AuthServiceClient;
import com.userservice.domain.Clazz;
import com.userservice.domain.UserProfile;
import com.userservice.exception.ResourceNotFoundException;
import com.userservice.repository.ClassRepository;
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
    private final ClassRepository classRepository;
    private final AuthServiceClient authServiceClient;

    public List<UserProfile> findAll() {
        return userProfileRepository.findAll();
    }

    public Optional<UserProfile> findById(Long id) {
        return userProfileRepository.findById(id);
    }

    public Optional<UserProfile> findByStudentId(String studentId) {
        return userProfileRepository.findByStudentId(studentId);
    }

    @Transactional
    public UserProfile save(UserProfile userProfile) {
        userProfile.setClazz(resolveClazz(userProfile));
        UserProfile savedProfile = userProfileRepository.save(userProfile);
        createAuthAccount(savedProfile);
        return savedProfile;
    }

    @Transactional
    public String bulkImport(List<UserProfile> profiles) {
        List<UserProfile> newProfiles = profiles.stream()
                .filter(profile -> profile.getStudentId() != null && !profile.getStudentId().isBlank())
                .filter(profile -> profile.getFullName() != null && !profile.getFullName().isBlank())
                .filter(profile -> userProfileRepository.findByStudentId(profile.getStudentId()).isEmpty())
                .toList();

        if (newProfiles.isEmpty()) {
            return "Không có hồ sơ sinh viên mới để import.";
        }

        List<UserProfile> savedProfiles = userProfileRepository.saveAll(newProfiles);

        List<com.userservice.dto.BulkRegisterMessage.UserAccountDTO> accounts = savedProfiles.stream()
                .map(profile -> new com.userservice.dto.BulkRegisterMessage.UserAccountDTO(
                        profile.getStudentId(),
                        profile.getStudentId() + "@student.stu.edu.vn"
                ))
                .toList();

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
            user.setClazz(resolveClazz(userDetails));
            user.setStudentStatus(userDetails.getStudentStatus());
            return userProfileRepository.save(user);
        }).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy UserProfile với id: " + id));
    }

    public void delete(Long id) {
        if (!userProfileRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy UserProfile với id: " + id);
        }
        userProfileRepository.deleteById(id);
    }

    @Transactional
    public UserProfile updateContactByStudentId(String studentId, String contactPhone) {
        UserProfile user = userProfileRepository.findByStudentId(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy UserProfile với studentId: " + studentId));

        user.setContactPhone(contactPhone);
        return userProfileRepository.save(user);
    }

    private void createAuthAccount(UserProfile profile) {
        authServiceClient.registerAccount(new AuthServiceClient.RegisterRequest(
                profile.getStudentId(),
                profile.getStudentId() + "@student.stu.edu.vn"
        ));
    }

    private Clazz resolveClazz(UserProfile userProfile) {
        if (userProfile.getClazz() == null || userProfile.getClazz().getId() == null) {
            return null;
        }

        return classRepository.findById(userProfile.getClazz().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp với id: " + userProfile.getClazz().getId()));
    }
}
