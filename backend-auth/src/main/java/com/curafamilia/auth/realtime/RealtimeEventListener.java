package com.curafamilia.auth.realtime;

@FunctionalInterface
public interface RealtimeEventListener {
    void onEvent(RealtimeEvent event);
}
