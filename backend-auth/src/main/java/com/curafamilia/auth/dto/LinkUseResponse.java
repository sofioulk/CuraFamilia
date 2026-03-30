package com.curafamilia.auth.dto;

public class LinkUseResponse {
    private String message;
    private LinkedSeniorItem senior;

    public LinkUseResponse() {
    }

    public LinkUseResponse(String message, LinkedSeniorItem senior) {
        this.message = message;
        this.senior = senior;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LinkedSeniorItem getSenior() {
        return senior;
    }

    public void setSenior(LinkedSeniorItem senior) {
        this.senior = senior;
    }
}
