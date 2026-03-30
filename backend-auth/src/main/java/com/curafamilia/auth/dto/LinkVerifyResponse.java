package com.curafamilia.auth.dto;

public class LinkVerifyResponse {
    private boolean valid;
    private String message;
    private String expiresAt;
    private LinkedSeniorItem senior;
    private boolean alreadyLinked;

    public LinkVerifyResponse() {
    }

    public LinkVerifyResponse(boolean valid, String message, String expiresAt,
                              LinkedSeniorItem senior, boolean alreadyLinked) {
        this.valid = valid;
        this.message = message;
        this.expiresAt = expiresAt;
        this.senior = senior;
        this.alreadyLinked = alreadyLinked;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
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

    public boolean isAlreadyLinked() {
        return alreadyLinked;
    }

    public void setAlreadyLinked(boolean alreadyLinked) {
        this.alreadyLinked = alreadyLinked;
    }
}
