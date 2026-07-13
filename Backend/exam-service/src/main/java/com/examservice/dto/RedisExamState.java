package com.examservice.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class RedisExamState {
    private String startedAt;
    private List<String> questionIds = new ArrayList<>();
    private Map<String, List<String>> optionOrderByQuestion = new HashMap<>();
    private Map<String, String> answers = new HashMap<>();
}
