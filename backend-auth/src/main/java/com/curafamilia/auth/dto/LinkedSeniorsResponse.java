package com.curafamilia.auth.dto;

import java.util.List;

public class LinkedSeniorsResponse {
    private int count;
    private List<LinkedSeniorItem> seniors;

    public LinkedSeniorsResponse() {
    }

    public LinkedSeniorsResponse(int count, List<LinkedSeniorItem> seniors) {
        this.count = count;
        this.seniors = seniors;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public List<LinkedSeniorItem> getSeniors() {
        return seniors;
    }

    public void setSeniors(List<LinkedSeniorItem> seniors) {
        this.seniors = seniors;
    }
}
