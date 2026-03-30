package com.curafamilia.auth.dto;

import java.util.List;

public class SocketStatusResponse {
    private String type;
    private String message;
    private List<Long> seniorIds;
    private String serverTime;

    public SocketStatusResponse() {
    }

    public SocketStatusResponse(String type, String message, List<Long> seniorIds, String serverTime) {
        this.type = type;
        this.message = message;
        this.seniorIds = seniorIds;
        this.serverTime = serverTime;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<Long> getSeniorIds() {
        return seniorIds;
    }

    public void setSeniorIds(List<Long> seniorIds) {
        this.seniorIds = seniorIds;
    }

    public String getServerTime() {
        return serverTime;
    }

    public void setServerTime(String serverTime) {
        this.serverTime = serverTime;
    }
}
