package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class RegisterRequest {
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String name;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String email;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String phone;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String role;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String password;

    public RegisterRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
