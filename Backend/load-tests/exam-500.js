import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://api-gateway:8000";
const EXAM_ID = __ENV.EXAM_ID || "1";
const VUS = Number(__ENV.VUS || 3000);
const MODE = (__ENV.MODE || "full").toLowerCase();
const SUBMIT_AFTER_SECONDS = Number(__ENV.SUBMIT_AFTER_SECONDS || 30);

const students = new SharedArray("students", () => {
  return open("./students.csv")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [username, password] = line.split(",");
      return {
        username: username.trim(),
        password: password.trim(),
      };
    });
});

export const options = {
  scenarios: {
    exam_students: {
      executor: "per-vu-iterations",
      vus: VUS,
      iterations: 1,
      maxDuration: "15m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
  },
};

export function setup() {
  return {
    submitAt: Date.now() + SUBMIT_AFTER_SECONDS * 1000,
  };
}

function login(student) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      username: student.username,
      password: student.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  check(res, {
    "login ok": (response) => response.status === 200,
  });

  const accessToken = res.json("accessToken");
  if (!accessToken) {
    return null;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function getOrStartExam(headers) {
  const stateRes = http.get(`${BASE_URL}/api/exams/${EXAM_ID}/state`, { headers });
  if (stateRes.status === 200) {
    return stateRes;
  }

  const startRes = http.post(`${BASE_URL}/api/exams/${EXAM_ID}/start`, null, { headers });
  check(startRes, {
    "start exam ok": (response) => response.status === 200,
  });
  return startRes;
}

function answerAllQuestions(headers, state) {
  let latestState = state;
  let savedCount = 0;

  for (const question of state.questions || []) {
    const firstOption = question.options?.[0];
    if (!firstOption) {
      continue;
    }

    const saveRes = http.put(
      `${BASE_URL}/api/exams/${EXAM_ID}/answers`,
      JSON.stringify({
        questionId: String(question.id),
        optionId: String(firstOption.id),
      }),
      { headers },
    );

    check(saveRes, {
      "save answer ok": (response) => response.status === 200,
    });

    if (saveRes.status === 200) {
      latestState = saveRes.json();
      savedCount += 1;
    }
  }

  check({ savedCount, total: state.questions?.length || 0 }, {
    "answered all questions": (result) => result.total > 0 && result.savedCount === result.total,
  });

  return latestState;
}

function waitUntilSubmitTime(submitAt) {
  const remainingMs = submitAt - Date.now();
  if (remainingMs > 0) {
    sleep(remainingMs / 1000);
  }
}

export default function (data) {
  const student = students[__VU - 1];
  if (!student) {
    return;
  }

  const headers = login(student);
  if (!headers) {
    return;
  }

  if (MODE === "submit") {
    waitUntilSubmitTime(data.submitAt);
    const submitRes = http.post(`${BASE_URL}/api/exams/${EXAM_ID}/submit`, null, { headers });
    check(submitRes, {
      "submit exam ok": (response) => response.status === 200,
    });
    return;
  }

  const myExamsRes = http.get(`${BASE_URL}/api/exams/my`, { headers });
  check(myExamsRes, {
    "load my exams ok": (response) => response.status === 200,
  });

  const examStateRes = getOrStartExam(headers);
  if (examStateRes.status !== 200) {
    return;
  }

  const state = examStateRes.json();
  answerAllQuestions(headers, state);

  if (MODE === "prepare") {
    return;
  }

  waitUntilSubmitTime(data.submitAt);
  const submitRes = http.post(`${BASE_URL}/api/exams/${EXAM_ID}/submit`, null, { headers });
  check(submitRes, {
    "submit exam ok": (response) => response.status === 200,
  });
}