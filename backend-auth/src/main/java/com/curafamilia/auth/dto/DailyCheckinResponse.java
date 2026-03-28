package com.curafamilia.auth.dto;

public class DailyCheckinResponse {
    private String message;
    private CheckinData checkin;

    public DailyCheckinResponse() {
    }

    public DailyCheckinResponse(String message, CheckinData checkin) {
        this.message = message;
        this.checkin = checkin;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public CheckinData getCheckin() {
        return checkin;
    }

    public void setCheckin(CheckinData checkin) {
        this.checkin = checkin;
    }

    public static class CheckinData {
        private Long seniorId;
        private String question;
        private String answer;
        private String answeredAt;

        public CheckinData() {
        }

        public CheckinData(Long seniorId, String question, String answer, String answeredAt) {
            this.seniorId = seniorId;
            this.question = question;
            this.answer = answer;
            this.answeredAt = answeredAt;
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

        public String getAnsweredAt() {
            return answeredAt;
        }

        public void setAnsweredAt(String answeredAt) {
            this.answeredAt = answeredAt;
        }
    }
}
