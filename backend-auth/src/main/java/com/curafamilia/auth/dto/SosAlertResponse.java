package com.curafamilia.auth.dto;

public class SosAlertResponse {
    private String message;
    private AlertData alert;
    private Boolean alreadyActive;

    public SosAlertResponse() {
    }

    public SosAlertResponse(String message, AlertData alert, Boolean alreadyActive) {
        this.message = message;
        this.alert = alert;
        this.alreadyActive = alreadyActive;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public AlertData getAlert() {
        return alert;
    }

    public void setAlert(AlertData alert) {
        this.alert = alert;
    }

    public Boolean getAlreadyActive() {
        return alreadyActive;
    }

    public void setAlreadyActive(Boolean alreadyActive) {
        this.alreadyActive = alreadyActive;
    }

    public static class AlertData {
        private Long id;
        private Long seniorId;
        private String status;
        private String triggeredAt;
        private String comment;

        public AlertData() {
        }

        public AlertData(Long id, Long seniorId, String status, String triggeredAt, String comment) {
            this.id = id;
            this.seniorId = seniorId;
            this.status = status;
            this.triggeredAt = triggeredAt;
            this.comment = comment;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getSeniorId() {
            return seniorId;
        }

        public void setSeniorId(Long seniorId) {
            this.seniorId = seniorId;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getTriggeredAt() {
            return triggeredAt;
        }

        public void setTriggeredAt(String triggeredAt) {
            this.triggeredAt = triggeredAt;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }
    }
}
