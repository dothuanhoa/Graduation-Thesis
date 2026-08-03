import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter, Rate } from "k6/metrics";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

const BASE_URL = __ENV.BASE_URL || "http://api-gateway:8000";
const ACTIVITY_ID = __ENV.ACTIVITY_ID || "";
const ADMIN_USERNAME = __ENV.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "Admin123!@";
const STUDENTS_FILE = __ENV.STUDENTS_FILE || "./students.csv";
const VUS = Number(__ENV.VUS || 500);
const CAPACITY = Number(__ENV.CAPACITY || VUS);
const REGISTER_AFTER_SECONDS = Number(__ENV.REGISTER_AFTER_SECONDS || 5);
const LOCAL_TIME_OFFSET_MINUTES = Number(__ENV.LOCAL_TIME_OFFSET_MINUTES || 420);
const CHECK_ACTIVITY_LIST = (__ENV.CHECK_ACTIVITY_LIST || "true").toLowerCase() !== "false";
const CREATE_ACTIVITY = (__ENV.CREATE_ACTIVITY || (ACTIVITY_ID ? "false" : "true")).toLowerCase() !== "false";
const EXPECT_FULL = (__ENV.EXPECT_FULL || (CAPACITY < VUS ? "true" : "false")).toLowerCase() !== "false";
const SUMMARY_HTML = (__ENV.SUMMARY_HTML || "true").toLowerCase() !== "false";

const unexpectedFailureRate = new Rate("unexpected_failure_rate");
const registerSuccess = new Counter("register_success");
const registerRejectedFull = new Counter("register_rejected_full_or_duplicate");

const students = new SharedArray("students", () => {
  return open(STUDENTS_FILE)
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
    activity_registration_students: {
      executor: "per-vu-iterations",
      vus: VUS,
      iterations: 1,
      maxDuration: "10m",
    },
  },
  thresholds: {
    unexpected_failure_rate: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
  },
};

function isoLocalDateTimeFromNow(offsetMs) {
  const date = new Date(Date.now() + offsetMs + LOCAL_TIME_OFFSET_MINUTES * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-") + "T" + [
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join(":");
}

function login(username, password, label) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  const ok = check(res, {
    [`${label} login ok`]: (response) => {
      if (response.status !== 200 || !response.body) {
        return false;
      }
      return !!response.json("accessToken");
    },
  });
  unexpectedFailureRate.add(!ok);

  if (!ok || !res.body) {
    return null;
  }

  const accessToken = res.json("accessToken");
  if (!accessToken) {
    return null;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function createLimitedActivity(headers) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const payload = {
    title: `Load test dang ky hoat dong ${unique}`,
    category: "UNIVERSITY",
    reward: "+5",
    participationType: "LIMITED",
    registrationStartTime: isoLocalDateTimeFromNow(-60 * 1000),
    registrationEndTime: isoLocalDateTimeFromNow(20 * 60 * 1000),
    location: "Phong CTSV",
    startTime: isoLocalDateTimeFromNow(30 * 60 * 1000),
    endTime: isoLocalDateTimeFromNow(90 * 60 * 1000),
    capacity: CAPACITY,
  };

  const res = http.post(`${BASE_URL}/api/activities`, JSON.stringify(payload), { headers });
  const ok = check(res, {
    "admin create limited activity ok": (response) => response.status === 200 && !!response.json("id"),
  });
  unexpectedFailureRate.add(!ok);

  return res.json("id");
}

export function setup() {
  if (students.length < VUS) {
    throw new Error(`File ${STUDENTS_FILE} chỉ có ${students.length} tài khoản, không đủ cho ${VUS} VUs.`);
  }

  let activityId = ACTIVITY_ID;

  if (CREATE_ACTIVITY) {
    const adminHeaders = login(ADMIN_USERNAME, ADMIN_PASSWORD, "admin");
    if (!adminHeaders) {
      throw new Error("Không đăng nhập được admin để tạo hoạt động test. Hãy kiểm tra ADMIN_USERNAME/ADMIN_PASSWORD hoặc truyền sẵn ACTIVITY_ID.");
    }

    activityId = createLimitedActivity(adminHeaders);
    if (!activityId) {
      throw new Error("Không tạo được hoạt động LIMITED để test đăng ký.");
    }
  }

  if (!activityId) {
    throw new Error("Thiếu ACTIVITY_ID. Hãy truyền ACTIVITY_ID hoặc cho phép script tạo hoạt động bằng CREATE_ACTIVITY=true.");
  }

  return {
    activityId: String(activityId),
    registerAt: Date.now() + REGISTER_AFTER_SECONDS * 1000,
  };
}

function waitUntil(timestamp) {
  const remainingMs = timestamp - Date.now();
  if (remainingMs > 0) {
    sleep(remainingMs / 1000);
  }
}

function isExpectedRegisterResponse(res) {
  if (res.status === 200) {
    registerSuccess.add(1);
    return true;
  }

  if (EXPECT_FULL && [400, 409].includes(res.status)) {
    registerRejectedFull.add(1);
    return true;
  }

  return false;
}

export default function (data) {
  const student = students[__VU - 1];
  if (!student) {
    unexpectedFailureRate.add(true);
    return;
  }

  const headers = login(student.username, student.password, "student");
  if (!headers) {
    return;
  }

  if (CHECK_ACTIVITY_LIST) {
    const listRes = http.get(`${BASE_URL}/api/activities`, { headers });
    const listOk = check(listRes, {
      "student load activities ok": (response) => response.status === 200,
    });
    unexpectedFailureRate.add(!listOk);
  }

  const detailRes = http.get(`${BASE_URL}/api/activities/${encodeURIComponent(data.activityId)}`, { headers });
  const detailOk = check(detailRes, {
    "student load activity detail ok": (response) => response.status === 200,
  });
  unexpectedFailureRate.add(!detailOk);

  if (detailRes.status !== 200) {
    return;
  }

  waitUntil(data.registerAt);

  const registerRes = http.post(
    `${BASE_URL}/api/activities/${encodeURIComponent(data.activityId)}/registrations/me`,
    null,
    { headers },
  );

  const accepted = check(registerRes, {
    "student register accepted or expected rejected": isExpectedRegisterResponse,
  });
  unexpectedFailureRate.add(!accepted);

  const afterRegisterDetailRes = http.get(`${BASE_URL}/api/activities/${encodeURIComponent(data.activityId)}`, { headers });
  const afterRegisterDetailOk = check(afterRegisterDetailRes, {
    "student reload activity detail ok": (response) => response.status === 200,
  });
  unexpectedFailureRate.add(!afterRegisterDetailOk);
}

export function handleSummary(data) {
  const summary = {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };

  if (!SUMMARY_HTML) {
    return summary;
  }

  return {
    ...summary,
    "activity-registration-summary.html": htmlReport(data),
  };
}
