package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class MedicationTakeRequest {
    @JsonbTypeAdapter(FlexibleLongAdapter.class)
    private Long seniorId;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String scheduledAt;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String takenAt;

    public MedicationTakeRequest() {
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(String scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public String getTakenAt() {
        return takenAt;
    }

    public void setTakenAt(String takenAt) {
        this.takenAt = takenAt;
    }
}
