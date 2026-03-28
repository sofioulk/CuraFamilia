package com.curafamilia.auth.util;

import com.curafamilia.auth.dto.UserResponse;
import com.curafamilia.auth.entity.User;

public final class UserMapper {
    private UserMapper() {
    }

    public static UserResponse toResponse(User user) {
        return new UserResponse(
                "u_" + user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
