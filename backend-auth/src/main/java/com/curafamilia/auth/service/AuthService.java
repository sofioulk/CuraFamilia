package com.curafamilia.auth.service;

import com.curafamilia.auth.config.DatabaseConfig;
import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.AuthResponse;
import com.curafamilia.auth.dto.ForgotPasswordRequest;
import com.curafamilia.auth.dto.LoginRequest;
import com.curafamilia.auth.dto.MessageResponse;
import com.curafamilia.auth.dto.RegisterRequest;
import com.curafamilia.auth.entity.PasswordResetToken;
import com.curafamilia.auth.entity.User;
import com.curafamilia.auth.entity.UserRole;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.repository.PasswordResetTokenRepository;
import com.curafamilia.auth.repository.UserRepository;
import com.curafamilia.auth.util.PasswordUtil;
import com.curafamilia.auth.util.TokenUtil;
import com.curafamilia.auth.util.UserMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

public class AuthService {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    public AuthResponse register(RegisterRequest request) {
        validateRegisterRequest(request);

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            UserRepository userRepository = new UserRepository(entityManager);
            if (userRepository.findByEmail(normalizeEmail(request.getEmail())).isPresent()) {
                throw new ApiException(Response.Status.CONFLICT, "Un compte avec cet email existe deja.");
            }

            transaction.begin();
            User user = new User();
            user.setName(request.getName().trim());
            user.setEmail(normalizeEmail(request.getEmail()));
            user.setPhone(normalizeOptional(request.getPhone()));
            user.setRole(UserRole.fromValue(request.getRole()));
            user.setPasswordHash(PasswordUtil.hash(request.getPassword()));
            user.setActive(Boolean.TRUE);
            userRepository.save(user);
            transaction.commit();

            return new AuthResponse(UserMapper.toResponse(user), TokenUtil.generateAuthToken(user));
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    public AuthResponse login(LoginRequest request) {
        validateLoginRequest(request);

        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            UserRepository userRepository = new UserRepository(entityManager);
            User user = userRepository.findByEmail(normalizeEmail(request.getEmail()))
                    .orElseThrow(() -> new ApiException(Response.Status.UNAUTHORIZED, "Email ou mot de passe incorrect."));

            if (!Boolean.TRUE.equals(user.getActive())) {
                throw new ApiException(Response.Status.FORBIDDEN, "Ce compte est desactive.");
            }
            if (!PasswordUtil.matches(request.getPassword(), user.getPasswordHash())) {
                throw new ApiException(Response.Status.UNAUTHORIZED, "Email ou mot de passe incorrect.");
            }

            return new AuthResponse(UserMapper.toResponse(user), TokenUtil.generateAuthToken(user));
        } finally {
            entityManager.close();
        }
    }

    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        validateForgotPasswordRequest(request);

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            UserRepository userRepository = new UserRepository(entityManager);
            userRepository.findByEmail(normalizeEmail(request.getEmail())).ifPresent(user -> {
                transaction.begin();
                PasswordResetToken token = new PasswordResetToken();
                token.setUser(user);
                token.setTokenHash(TokenUtil.sha256(TokenUtil.generateRawResetToken()));
                token.setExpiresAt(LocalDateTime.now().plusMinutes(DatabaseConfig.getInt("reset.expiration.minutes", 30)));
                new PasswordResetTokenRepository(entityManager).save(token);
                transaction.commit();
            });
            return new MessageResponse("Reset link sent.");
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    private void validateRegisterRequest(RegisterRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }
        if (isBlank(request.getName())) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Name is required.");
        }
        validateEmail(request.getEmail());
        if (isBlank(request.getPassword()) || request.getPassword().trim().length() < 6) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Password must contain at least 6 characters.");
        }
        if (isBlank(request.getRole())) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Role is required.");
        }
        try {
            UserRole.fromValue(request.getRole());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(Response.Status.BAD_REQUEST, exception.getMessage());
        }
    }

    private void validateLoginRequest(LoginRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }
        validateEmail(request.getEmail());
        if (isBlank(request.getPassword())) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Password is required.");
        }
    }

    private void validateForgotPasswordRequest(ForgotPasswordRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }
        validateEmail(request.getEmail());
    }

    private void validateEmail(String email) {
        if (isBlank(email)) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Email is required.");
        }
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Email format is invalid.");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }
}
