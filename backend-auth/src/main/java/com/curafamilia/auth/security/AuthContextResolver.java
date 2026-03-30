package com.curafamilia.auth.security;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.util.TokenUtil;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;

public final class AuthContextResolver {
    private AuthContextResolver() {
    }

    public static AuthenticatedUser requireAuthenticatedUser(HttpHeaders headers) {
        String authorization = headers == null ? null : headers.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (authorization == null || authorization.isBlank()) {
            throw new ApiException(Response.Status.UNAUTHORIZED, "Authorization header is required.");
        }

        return authenticateBearerToken(extractBearerToken(authorization));
    }

    public static AuthenticatedUser authenticateBearerToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException(Response.Status.UNAUTHORIZED, "Bearer token is missing.");
        }

        try {
            DecodedJWT jwt = TokenUtil.verifyAuthToken(token.trim());
            Long userId = parseLongOrNull(jwt.getSubject());
            if (userId == null || userId <= 0) {
                throw new ApiException(Response.Status.UNAUTHORIZED, "Invalid token subject.");
            }
            String role = jwt.getClaim("role").asString();
            if (role == null || role.isBlank()) {
                throw new ApiException(Response.Status.UNAUTHORIZED, "Invalid token role.");
            }
            String email = jwt.getClaim("email").asString();
            return new AuthenticatedUser(userId, role, email);
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ApiException(Response.Status.UNAUTHORIZED, "Invalid or expired token.");
        }
    }

    private static String extractBearerToken(String authorization) {
        String trimmed = authorization.trim();
        if (!trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new ApiException(Response.Status.UNAUTHORIZED, "Authorization must use Bearer token.");
        }
        String token = trimmed.substring(7).trim();
        if (token.isBlank()) {
            throw new ApiException(Response.Status.UNAUTHORIZED, "Bearer token is missing.");
        }
        return token;
    }

    private static Long parseLongOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
