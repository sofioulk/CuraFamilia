package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class SosAlertRequest {
    @JsonbTypeAdapter(FlexibleLongAdapter.class)
    private Long seniorId;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String comment;

    public SosAlertRequest() {
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
