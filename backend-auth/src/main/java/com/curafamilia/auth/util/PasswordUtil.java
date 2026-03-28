package com.curafamilia.auth.util;

import at.favre.lib.crypto.bcrypt.BCrypt;

public final class PasswordUtil {
    private PasswordUtil() {
    }

    public static String hash(String rawPassword) {
        return BCrypt.withDefaults().hashToString(12, rawPassword.toCharArray());
    }

    public static boolean matches(String rawPassword, String hashedPassword) {
        return BCrypt.verifyer().verify(rawPassword.toCharArray(), hashedPassword).verified;
    }
}
