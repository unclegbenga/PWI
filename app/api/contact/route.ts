import { NextResponse } from "next/server";

export const runtime = "nodejs";

const INTERESTS = new Set(["Young person", "Mentor or volunteer", "Partner or supporter", "General enquiry"]);
const attempts = new Map<string, { count: number; startedAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 4;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  interest?: unknown;
  message?: unknown;
  company?: unknown;
};

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 8_000) return error("Please shorten your message and try again.", 413);

  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) return error("Please wait a few minutes before sending another enquiry.", 429);

  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return error("We could not read your enquiry. Please try again.", 400);
  }

  if (asText(payload.company, 200)) return NextResponse.json({ ok: true });

  const contact = {
    name: asText(payload.name, 160),
    email: asText(payload.email, 254).toLowerCase(),
    interest: asText(payload.interest, 80),
    message: asText(payload.message, 2_000),
  };

  if (!contact.name || !isEmail(contact.email) || !INTERESTS.has(contact.interest) || !contact.message) {
    return error("Please complete every required field before sending your enquiry.", 400);
  }

  try {
    await sendContactNotification(contact);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("Contact enquiry could not be sent", cause);
    return error("We could not send your enquiry right now. Please try again or contact PWI directly.", 503);
  }
}

function asText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(clientKey: string) {
  const now = Date.now();
  const current = attempts.get(clientKey);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    attempts.set(clientKey, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_ATTEMPTS;
}

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function sendContactNotification(contact: { name: string; email: string; interest: string; message: string }) {
  const endpoint = requiredEnv("GOOGLE_APPS_SCRIPT_WEB_APP_URL");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      submissionType: "contact",
      name: contact.name,
      email: contact.email,
      interest: contact.interest,
      message: contact.message,
      company: "",
    }),
  });
  if (!response.ok) throw new Error(`Apps Script returned ${response.status}`);
  const result = await response.json() as { ok?: boolean; message?: string };
  if (!result.ok) throw new Error(result.message || "Apps Script did not accept the enquiry");
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
