// PWI website registration endpoint.
// The first two values must match your Google Sheet and its tab name exactly.
const SPREADSHEET_ID = "1HYj6NVoXOOhK41lCvF_jsdLu6XLzdy0xtOe3f5sWVdk";
const SHEET_NAME = "Registrations";
const CONTACT_RECIPIENT = "Promisewesleyinitiative@gmail.com";

function doGet() {
  return json_({ ok: true, message: "PWI registration endpoint is ready." });
}

function doPost(e) {
  try {
    const fields = (e && e.parameter) || {};

    // Quietly accept bot submissions without writing them to the sheet.
    if (value_(fields.company, 120)) return json_({ ok: true });

    if (value_(fields.submissionType, 40) === "contact") {
      return sendContactEmail_(fields);
    }

    const registration = {
      fullName: value_(fields.fullName, 160),
      email: value_(fields.email, 254).toLowerCase(),
      phone: value_(fields.phone, 40),
      state: value_(fields.state, 100),
      interest: value_(fields.interest, 100),
      message: value_(fields.message, 2000),
      consent: String(fields.consent || "") === "true",
      sourcePage: value_(fields.sourcePage, 500) || "PWI website",
    };

    if (
      !registration.fullName ||
      !validEmail_(registration.email) ||
      !registration.state ||
      !registration.interest ||
      !registration.message ||
      !registration.consent
    ) {
      return json_({ ok: false, message: "Please complete every required field." });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Missing sheet tab: ' + SHEET_NAME);

    // A lock prevents simultaneous submissions from colliding.
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow([
        new Date(),
        sheetValue_(registration.fullName),
        sheetValue_(registration.email),
        sheetValue_(registration.phone),
        sheetValue_(registration.state),
        sheetValue_(registration.interest),
        sheetValue_(registration.message),
        "Yes",
        sheetValue_(registration.sourcePage),
      ]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true, message: "Registration saved." });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, message: "Unable to save registration. Please try again." });
  }
}

function sendContactEmail_(fields) {
  const contact = {
    name: value_(fields.name, 160),
    email: value_(fields.email, 254).toLowerCase(),
    interest: value_(fields.interest, 100),
    message: value_(fields.message, 2000),
  };

  if (!contact.name || !validEmail_(contact.email) || !contact.interest || !contact.message) {
    return json_({ ok: false, message: "Please complete every required field." });
  }

  const subject = "New PWI enquiry from " + headerValue_(contact.name);
  const textBody = [
    "A new enquiry was submitted through the PWI website.",
    "",
    "Name: " + contact.name,
    "Email: " + contact.email,
    "Enquiry type: " + contact.interest,
    "",
    "Message:",
    contact.message,
  ].join("\n");
  const htmlBody = [
    "<p>A new enquiry was submitted through the PWI website.</p>",
    "<p><strong>Name:</strong> " + html_(contact.name) + "<br>",
    "<strong>Email:</strong> " + html_(contact.email) + "<br>",
    "<strong>Enquiry type:</strong> " + html_(contact.interest) + "</p>",
    "<p><strong>Message</strong><br>" + html_(contact.message).replace(/\n/g, "<br>") + "</p>",
  ].join("");

  GmailApp.sendEmail(CONTACT_RECIPIENT, subject, textBody, {
    htmlBody: htmlBody,
    replyTo: contact.email,
    name: "Promise Wesley Initiative",
  });

  return json_({ ok: true, message: "Enquiry sent." });
}

function value_(input, maxLength) {
  return String(input || "").trim().slice(0, maxLength);
}

function validEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sheetValue_(value) {
  // Prevent a submitted value beginning with =, +, - or @ from becoming a formula.
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function headerValue_(value) {
  return value.replace(/[\r\n]+/g, " ");
}

function html_(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
