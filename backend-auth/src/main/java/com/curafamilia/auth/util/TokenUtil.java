package com.curafamilia.auth.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.curafamilia.auth.config.DatabaseConfig;
import com.curafamilia.auth.entity.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

public final class TokenUtil {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private TokenUtil() {
    }

    public static String generateAuthToken(User user) {
        String secret = DatabaseConfig.getRequired("jwt.secret");
        String issuer = DatabaseConfig.getRequired("jwt.issuer");
        int expirationMinutes = DatabaseConfig.getInt("jwt.expiration.minutes", 120);

        return JWT.create()
                .withIssuer(issuer)
                .withSubject(String.valueOf(user.getId()))
                .withClaim("role", user.getRole().name())
                .withClaim("email", user.getEmail())
                .withIssuedAt(Instant.now())
                .withExpiresAt(Instant.now().plus(expirationMinutes, ChronoUnit.MINUTES))
                .sign(Algorithm.HMAC256(secret));
    }

    public static DecodedJWT verifyAuthToken(String token) {
        String secret = DatabaseConfig.getRequired("jwt.secret");
        String issuer = DatabaseConfig.getRequired("jwt.issuer");
        JWTVerifier verifier = JWT.require(Algorithm.HMAC256(secret))
                .withIssuer(issuer)
                .build();
        return verifier.verify(token);
    }

    public static String generateRawResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte current : hash) {
                builder.append(String.format("%02x", current));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", exception);
        }
    }
}
