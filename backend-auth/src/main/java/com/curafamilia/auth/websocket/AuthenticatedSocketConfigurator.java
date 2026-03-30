package com.curafamilia.auth.websocket;

import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import jakarta.websocket.HandshakeResponse;
import jakarta.websocket.server.HandshakeRequest;
import jakarta.websocket.server.ServerEndpointConfig;
import java.util.List;
import java.util.Map;

public class AuthenticatedSocketConfigurator extends ServerEndpointConfig.Configurator {
    public static final String ACTOR_KEY = "actor";
    public static final String REQUESTED_SENIOR_ID_KEY = "requestedSeniorId";

    @Override
    public void modifyHandshake(ServerEndpointConfig config, HandshakeRequest request, HandshakeResponse response) {
        AuthenticatedUser actor = resolveActor(request);
        config.getUserProperties().put(ACTOR_KEY, actor);
        config.getUserProperties().put(REQUESTED_SENIOR_ID_KEY, parseSeniorId(first(request.getParameterMap(), "seniorId")));
    }

    private AuthenticatedUser resolveActor(HandshakeRequest request) {
        String token = first(request.getParameterMap(), "token");
        if (token != null && !token.isBlank()) {
            return AuthContextResolver.authenticateBearerToken(token);
        }

        String authorization = first(request.getHeaders(), "Authorization");
        if (authorization == null || authorization.isBlank()) {
            throw new IllegalStateException("Missing socket authentication token.");
        }
        if (!authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new IllegalStateException("Socket authorization must use Bearer token.");
        }
        return AuthContextResolver.authenticateBearerToken(authorization.substring(7).trim());
    }

    private Long parseSeniorId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            throw new IllegalStateException("Invalid socket seniorId.");
        }
    }

    private String first(Map<String, List<String>> values, String key) {
        List<String> items = values == null ? null : values.get(key);
        return items == null || items.isEmpty() ? null : items.getFirst();
    }
}
