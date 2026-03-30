package com.curafamilia.auth.security;

public record AuthenticatedUser(Long userId, String role, String email) {
    public boolean isFamily() {
        return role != null && "famille".equalsIgnoreCase(role);
    }

    public boolean isSenior() {
        return role != null && "senior".equalsIgnoreCase(role);
    }
}
