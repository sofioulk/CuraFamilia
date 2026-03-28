package com.curafamilia.auth.entity;

public enum UserRole {
    famille,
    senior;

    public static UserRole fromValue(String value) {
        for (UserRole role : values()) {
            if (role.name().equalsIgnoreCase(value)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Role must be 'famille' or 'senior'.");
    }
}
