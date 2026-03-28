package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class AssistantChatRequest {
    @JsonbTypeAdapter(FlexibleLongAdapter.class)
    private Long seniorId;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String message;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String date;

    public AssistantChatRequest() {
    }

    public AssistantChatRequest(Long seniorId, String message, String date) {
        this.seniorId = seniorId;
        this.message = message;
        this.date = date;
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}
