package com.curafamilia.auth.dto;

import java.util.List;

public class SosAlertHistoryResponse {
    private Long seniorId;
    private Integer count;
    private List<SosAlertResponse.AlertData> alerts;

    public SosAlertHistoryResponse() {
    }

    public SosAlertHistoryResponse(Long seniorId, Integer count, List<SosAlertResponse.AlertData> alerts) {
        this.seniorId = seniorId;
        this.count = count;
        this.alerts = alerts;
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public Integer getCount() {
        return count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }

    public List<SosAlertResponse.AlertData> getAlerts() {
        return alerts;
    }

    public void setAlerts(List<SosAlertResponse.AlertData> alerts) {
        this.alerts = alerts;
    }
}
