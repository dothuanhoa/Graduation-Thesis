package com.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkRegisterMessage {
    private List<UserAccountDTO> accounts;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserAccountDTO {
        private String username;
        private String email;
    }
}
