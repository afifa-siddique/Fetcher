// Project #02: The Fault-Tolerant Data Fetcher

//1. The Endpoint List
const targets = [
  { id: 1, service: "GitHub API", url: "https://api.github.com", responseTime: 600 },
  { id: 2, service: "Weather API", url: "https://api.weather.com/v1", responseTime: 900 },
  { id: 3, service: "Payments API", url: "http://payments.example.com", responseTime: 1200 },
  { id: 4, service: "News API", url: "https://news.example.com/feed", responseTime: 400 },
  // --- Bad entries (the test) ---
  { id: 5, service: "Broken URL Service", url: "ftp://files.example.com", responseTime: 500 }, // bad protocol
  { id: 6, url: "https://noname.example.com", responseTime: 300 },                            // missing service
  { id: 7, service: "Time Traveler API", url: "https://time.example.com", responseTime: -200 }, // negative time
  {},                                                                                         // empty object
];

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
const FAIL_RATE = 0.3;

// Helpers
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 2. The Validator
// Returns an error message string if invalid, or null if valid.
const validateTarget = (target) => {
  if (!target || Object.keys(target).length === 0) {
    return "Target is an empty object";
  }

  const { id, service, url, responseTime } = target;

  if (!service || typeof service !== "string" || service.trim() === "") {
    return `Target #${id ?? "?"} is missing a service name`;
  }
  if (typeof url !== "string" || !(url.startsWith("http://") || url.startsWith("https://"))) {
    return `[${service}] URL must start with http:// or https:// (got "${url}")`;
  }
  if (typeof responseTime !== "number" || responseTime < 0) {
    return `[${service}] Invalid response time: ${responseTime}`;
  }
  return null;
};

// 3. The Simulated Fetch Engine
const fakeFetch = (target) => {
  const { service, responseTime } = target;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < FAIL_RATE) {
        reject(new Error(`${service} did not respond (simulated network failure)`));
      } else {
        resolve({ service, status: 200, data: `Data from ${service}` });
      }
    }, responseTime);
  });
};

// Fetch with retry logic. Returns a result object (never throws).
const fetchWithRetry = async (target) => {
  const { service } = target;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // ---------- 4. Live Updates ----------
    console.log(`🌐 Fetching [${service}]... (attempt ${attempt}/${MAX_ATTEMPTS})`);
    const start = Date.now();

    try {
      const response = await fakeFetch(target);
      const timeTaken = Date.now() - start;
      console.log(`   ✅ Success in ${timeTaken}ms`);
      return { service, success: true, attempts: attempt, timeTaken, response };
    } catch (error) {
      const willRetry = attempt < MAX_ATTEMPTS;
      console.log(
        `   ❌ Failed: ${error.message}. ${
          willRetry ? `Retrying in ${RETRY_DELAY_MS}ms...` : "No more retries."
        }`
      );

      if (willRetry) {
        await sleep(RETRY_DELAY_MS);
      } else {
        return { service, success: false, attempts: attempt, error: error.message };
      }
    }
  }
};

// 5. The Final Report
const printReport = (results, skipped) => {
  const firstTry = results.filter((r) => r.success && r.attempts === 1).length;
  const afterRetries = results.filter((r) => r.success && r.attempts > 1).length;
  const failed = results.filter((r) => !r.success).length;
  const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);

  const successful = results.filter((r) => r.success);
  const slowest = successful.length
    ? successful.reduce((max, r) => (r.timeTaken > max.timeTaken ? r : max))
    : null;

  console.log("\n==============================");
  console.log("        📊 FINAL REPORT");
  console.log("==============================");
  console.log(`✅ Succeeded on first try : ${firstTry}`);
  console.log(`🔁 Succeeded after retries: ${afterRetries}`);
  console.log(`❌ Failed after all retries: ${failed}`);
  console.log(`⏭️  Skipped as invalid     : ${skipped}`);
  console.log(`🔢 Total attempts made    : ${totalAttempts}`);
  console.log(
    slowest
      ? `🐢 Slowest successful fetch: ${slowest.service} (${slowest.timeTaken}ms)`
      : "🐢 Slowest successful fetch: none"
  );
};

// ---------- Main ----------
const main = async () => {
  console.log("🚀 Starting nightly data fetch...\n");

  const results = [];
  let skipped = 0;

  // Process targets one at a time
  for (const target of targets) {
    const problem = validateTarget(target);

    if (problem) {
      console.warn(`⚠️  Skipping invalid target: ${problem}`);
      skipped++;
      continue; // move on without crashing
    }

    const result = await fetchWithRetry(target);
    results.push(result);
  }

  printReport(results, skipped);
};

main().catch((err) => console.error("Unexpected error:", err));
