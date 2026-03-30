package com.curafamilia.auth.dto;

public class SocketCommandRequest {
    private String action;
    private Long seniorId;

    public SocketCommandRequest() {
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }
}
