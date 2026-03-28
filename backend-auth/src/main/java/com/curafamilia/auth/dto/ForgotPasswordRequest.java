package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class ForgotPasswordRequest {
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String email;

    public ForgotPasswordRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
