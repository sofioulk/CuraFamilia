package com.curafamilia.auth.realtime;

public class RealtimeEvent {
    private String event;
    private Long seniorId;
    private Long actorUserId;
    private String actorRole;
    private String occurredAt;
    private Object data;

    public RealtimeEvent() {
    }

    public RealtimeEvent(String event, Long seniorId, Long actorUserId, String actorRole, String occurredAt, Object data) {
        this.event = event;
        this.seniorId = seniorId;
        this.actorUserId = actorUserId;
        this.actorRole = actorRole;
        this.occurredAt = occurredAt;
        this.data = data;
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(Long actorUserId) {
        this.actorUserId = actorUserId;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public String getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(String occurredAt) {
        this.occurredAt = occurredAt;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }
}
