const url = process.env.URL;
const token = process.env.CRON_SECRET;

if (!url) {
  console.error("URL is not set");
  process.exit(1);
}

if (!token) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

try {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const body = await response.text();

  if (!response.ok) {
    console.error(`cron endpoint failed with HTTP ${response.status}`);
    console.error(body);
    process.exit(1);
  }

  console.log("cron endpoint succeeded:", body);
} catch (error) {
  console.error("cron request failed:", error);
  process.exit(1);
}
