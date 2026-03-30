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
        private String acknowledgedAt;
        private Long acknowledgedByUserId;
        private String resolvedAt;
        private Long resolvedByUserId;

        public AlertData() {
        }

        public AlertData(Long id, Long seniorId, String status, String triggeredAt, String comment) {
            this(id, seniorId, status, triggeredAt, comment, null, null, null, null);
        }

        public AlertData(Long id, Long seniorId, String status, String triggeredAt, String comment,
                         String acknowledgedAt, Long acknowledgedByUserId,
                         String resolvedAt, Long resolvedByUserId) {
            this.id = id;
            this.seniorId = seniorId;
            this.status = status;
            this.triggeredAt = triggeredAt;
            this.comment = comment;
            this.acknowledgedAt = acknowledgedAt;
            this.acknowledgedByUserId = acknowledgedByUserId;
            this.resolvedAt = resolvedAt;
            this.resolvedByUserId = resolvedByUserId;
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

        public String getAcknowledgedAt() {
            return acknowledgedAt;
        }

        public void setAcknowledgedAt(String acknowledgedAt) {
            this.acknowledgedAt = acknowledgedAt;
        }

        public Long getAcknowledgedByUserId() {
            return acknowledgedByUserId;
        }

        public void setAcknowledgedByUserId(Long acknowledgedByUserId) {
            this.acknowledgedByUserId = acknowledgedByUserId;
        }

        public String getResolvedAt() {
            return resolvedAt;
        }

        public void setResolvedAt(String resolvedAt) {
            this.resolvedAt = resolvedAt;
        }

        public Long getResolvedByUserId() {
            return resolvedByUserId;
        }

        public void setResolvedByUserId(Long resolvedByUserId) {
            this.resolvedByUserId = resolvedByUserId;
        }
    }
}
