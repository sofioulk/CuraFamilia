package com.curafamilia.auth.websocket;

import java.io.IOException;
import java.util.Locale;

import com.curafamilia.auth.dto.SocketCommandRequest;
import com.curafamilia.auth.realtime.SocketSessionRegistry;
import com.curafamilia.auth.security.AuthenticatedUser;

import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;
import jakarta.websocket.CloseReason;
import jakarta.websocket.EndpointConfig;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

@ServerEndpoint(value = "/ws/events", configurator = AuthenticatedSocketConfigurator.class)
public class FamilyEventsSocketEndpoint {
    private static final Jsonb JSONB = JsonbBuilder.create();
    private final SocketSessionRegistry registry = SocketSessionRegistry.getInstance();

    @OnOpen
    public void onOpen(Session session, EndpointConfig config) throws IOException {
        AuthenticatedUser actor = (AuthenticatedUser) config.getUserProperties().get(AuthenticatedSocketConfigurator.ACTOR_KEY);
        if (actor == null) {
            session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Unauthorized"));
            return;
        }

        registry.register(session, actor);
        Long requestedSeniorId = (Long) config.getUserProperties().get(AuthenticatedSocketConfigurator.REQUESTED_SENIOR_ID_KEY);
        if (actor.isSenior() || requestedSeniorId != null) {
            registry.subscribe(session, requestedSeniorId);
        }
        registry.sendReady(session, "Socket connected.");
    }

    @OnMessage
    public void onMessage(Session session, String message) {
        try {
            SocketCommandRequest request = JSONB.fromJson(message, SocketCommandRequest.class);
            if (request == null || request.getAction() == null || request.getAction().isBlank()) {
                registry.sendError(session, "Socket action is required.");
                return;
            }

            String action = request.getAction().trim().toLowerCase(Locale.ROOT);
            switch (action) {
                case "subscribe" -> {
                    registry.subscribe(session, request.getSeniorId());
                    registry.sendReady(session, "Subscribed.");
                }
                case "unsubscribe" -> {
                    registry.unsubscribe(session, request.getSeniorId());
                    registry.sendReady(session, "Unsubscribed.");
                }
                case "ping" -> registry.sendPong(session);
                default -> registry.sendError(session, "Unsupported socket action.");
            }
        } catch (Exception exception) {
            registry.sendError(session, "Invalid socket payload.");
        }
    }

    @OnClose
    public void onClose(Session session) {
        registry.unregister(session);
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        registry.unregister(session);
    }
}
