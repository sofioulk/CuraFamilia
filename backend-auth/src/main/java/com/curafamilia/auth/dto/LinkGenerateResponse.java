package com.curafamilia.auth.dto;

public class LinkGenerateResponse {
    private String code;
    private String expiresAt;
    private LinkedSeniorItem senior;

    public LinkGenerateResponse() {
    }

    public LinkGenerateResponse(String code, String expiresAt, LinkedSeniorItem senior) {
        this.code = code;
        this.expiresAt = expiresAt;
        this.senior = senior;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LinkedSeniorItem getSenior() {
        return senior;
    }

    public void setSenior(LinkedSeniorItem senior) {
        this.senior = senior;
    }
}
