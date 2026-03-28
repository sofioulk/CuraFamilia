package com.curafamilia.auth.dto;

import jakarta.json.bind.annotation.JsonbTypeAdapter;

public class DailyCheckinRequest {
    @JsonbTypeAdapter(FlexibleLongAdapter.class)
    private Long seniorId;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String question;
    @JsonbTypeAdapter(FlexibleStringAdapter.class)
    private String answer;

    public DailyCheckinRequest() {
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
}
