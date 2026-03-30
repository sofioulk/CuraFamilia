package com.curafamilia.auth.realtime;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.SocketStatusResponse;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;
import jakarta.persistence.EntityManager;
import jakarta.websocket.CloseReason;
import jakarta.websocket.Session;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public final class SocketSessionRegistry implements RealtimeEventListener {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Jsonb JSONB = JsonbBuilder.create();
    private static final SocketSessionRegistry INSTANCE = new SocketSessionRegistry();

    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();
    private final Map<String, SocketSubscription> subscriptions = new ConcurrentHashMap<>();

    private SocketSessionRegistry() {
        RealtimeEventBus.addListener(this);
    }

    public static SocketSessionRegistry getInstance() {
        return INSTANCE;
    }

    public void register(Session session, AuthenticatedUser actor) {
        subscriptions.put(session.getId(), new SocketSubscription(session, actor));
    }

    public List<Long> subscribe(Session session, Long requestedSeniorId) {
        SocketSubscription subscription = subscriptions.get(session.getId());
        if (subscription == null) {
            return List.of();
        }

        Long seniorId = resolveSeniorId(subscription.actor, requestedSeniorId);
        subscription.seniorIds.add(seniorId);
        return listSeniorIds(subscription);
    }

    public List<Long> unsubscribe(Session session, Long requestedSeniorId) {
        SocketSubscription subscription = subscriptions.get(session.getId());
        if (subscription == null) {
            return List.of();
        }

        Long seniorId = subscription.actor.isSenior() ? subscription.actor.userId() : requestedSeniorId;
        if (seniorId != null) {
            subscription.seniorIds.remove(seniorId);
        }
        return listSeniorIds(subscription);
    }

    public void unregister(Session session) {
        if (session != null) {
            subscriptions.remove(session.getId());
        }
    }

    public void sendReady(Session session, String message) {
        SocketSubscription subscription = subscriptions.get(session.getId());
        if (subscription == null) {
            return;
        }
        sendStatus(session, "ready", message, listSeniorIds(subscription));
    }

    public void sendError(Session session, String message) {
        sendStatus(session, "error", message, List.of());
    }

    public void sendPong(Session session) {
        SocketSubscription subscription = subscriptions.get(session.getId());
        List<Long> seniorIds = subscription == null ? List.of() : listSeniorIds(subscription);
        sendStatus(session, "pong", "pong", seniorIds);
    }

    @Override
    public void onEvent(RealtimeEvent event) {
        if (event == null || event.getSeniorId() == null) {
            return;
        }

        if ("link:unlinked".equals(event.getEvent()) && event.getActorUserId() != null) {
            disconnectFamilyLink(event.getActorUserId(), event.getSeniorId());
        }

        String json = JSONB.toJson(event);
        for (SocketSubscription subscription : subscriptions.values()) {
            if (subscription.seniorIds.contains(event.getSeniorId())) {
                subscription.session.getAsyncRemote().sendText(json);
            }
        }
    }

    private Long resolveSeniorId(AuthenticatedUser actor, Long requestedSeniorId) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            return seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
        } finally {
            entityManager.close();
        }
    }

    private void disconnectFamilyLink(Long familyUserId, Long seniorId) {
        for (SocketSubscription subscription : subscriptions.values()) {
            if (!subscription.actor.isFamily()) {
                continue;
            }
            if (!subscription.actor.userId().equals(familyUserId)) {
                continue;
            }
            if (!subscription.seniorIds.contains(seniorId)) {
                continue;
            }
            subscription.seniorIds.remove(seniorId);
            if (subscription.seniorIds.isEmpty()) {
                try {
                    subscription.session.close(new CloseReason(CloseReason.CloseCodes.NORMAL_CLOSURE, "Link removed"));
                } catch (IOException ignored) {
                    // Best effort close.
                }
                subscriptions.remove(subscription.session.getId());
            }
        }
    }

    private void sendStatus(Session session, String type, String message, List<Long> seniorIds) {
        if (session == null || !session.isOpen()) {
            return;
        }
        SocketStatusResponse response = new SocketStatusResponse(
                type,
                message,
                seniorIds,
                LocalDateTime.now().format(DATE_TIME_FORMATTER)
        );
        session.getAsyncRemote().sendText(JSONB.toJson(response));
    }

    private List<Long> listSeniorIds(SocketSubscription subscription) {
        return subscription.seniorIds.stream().sorted(Comparator.naturalOrder()).toList();
    }

    private static class SocketSubscription {
        private final Session session;
        private final AuthenticatedUser actor;
        private final Set<Long> seniorIds = ConcurrentHashMap.newKeySet();

        private SocketSubscription(Session session, AuthenticatedUser actor) {
            this.session = session;
            this.actor = actor;
        }
    }
}
