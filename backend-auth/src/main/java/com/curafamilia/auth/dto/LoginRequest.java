package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class LoginRequest {
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String email;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String password;

    public LoginRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
