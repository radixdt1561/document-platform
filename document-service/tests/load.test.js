import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const uploadLatency = new Trend('upload_url_latency');
const listLatency   = new Trend('list_documents_latency');
const errorRate     = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10  }, // ramp up
    { duration: '1m',  target: 50  }, // sustained load
    { duration: '30s', target: 100 }, // spike
    { duration: '30s', target: 0   }, // ramp down
  ],
  thresholds: {
    http_req_duration:    ['p(95)<500'],  // 95% of requests under 500ms
    upload_url_latency:   ['p(95)<600'],
    list_documents_latency: ['p(95)<300'],
    error_rate:           ['rate<0.01'],  // less than 1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4002';
const TOKEN    = __ENV.TOKEN    || 'your-jwt-token-here';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

// POST /documents/upload-url — get a presigned S3 URL
export default function () {
  // --- GET /documents (list) ---
  const listRes = http.get(`${BASE_URL}/documents`, { headers });
  listLatency.add(listRes.timings.duration);
  errorRate.add(listRes.status >= 400);
  check(listRes, {
    'list: status 200':       (r) => r.status === 200,
    'list: has documents key': (r) => JSON.parse(r.body).documents !== undefined,
    'list: under 300ms':      (r) => r.timings.duration < 300,
  });

  // --- POST /documents/upload-url ---
  const uploadRes = http.post(
    `${BASE_URL}/documents/upload-url`,
    JSON.stringify({ fileName: `test-${Date.now()}.pdf`, contentType: 'application/pdf' }),
    { headers }
  );
  uploadLatency.add(uploadRes.timings.duration);
  errorRate.add(uploadRes.status >= 400);
  check(uploadRes, {
    'upload-url: status 200':  (r) => r.status === 200,
    'upload-url: has url key': (r) => JSON.parse(r.body).url !== undefined,
    'upload-url: under 600ms': (r) => r.timings.duration < 600,
  });

  sleep(1);
}
