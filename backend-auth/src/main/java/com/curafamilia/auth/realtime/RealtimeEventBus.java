package com.curafamilia.auth.realtime;

import com.curafamilia.auth.security.AuthenticatedUser;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CopyOnWriteArrayList;

public final class RealtimeEventBus {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final CopyOnWriteArrayList<RealtimeEventListener> LISTENERS = new CopyOnWriteArrayList<>();

    private RealtimeEventBus() {
    }

    public static void addListener(RealtimeEventListener listener) {
        if (listener != null) {
            LISTENERS.addIfAbsent(listener);
        }
    }

    public static void removeListener(RealtimeEventListener listener) {
        if (listener != null) {
            LISTENERS.remove(listener);
        }
    }

    public static void publish(String eventName, Long seniorId, AuthenticatedUser actor, Object data) {
        RealtimeEvent event = new RealtimeEvent(
                eventName,
                seniorId,
                actor == null ? null : actor.userId(),
                actor == null ? null : actor.role(),
                LocalDateTime.now().format(DATE_TIME_FORMATTER),
                data
        );

        for (RealtimeEventListener listener : LISTENERS) {
            listener.onEvent(event);
        }
    }
}
