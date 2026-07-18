/**
 * Helper to generate calendar event links and files for NYC CPC Hearings.
 * Standard hearing time is 10:00 AM to 12:00 PM (America/New_York timezone).
 */

const EVENT_DESCRIPTION_TEMPLATE = `How to participate
In Person:
City Planning Commission Hearing Room, Lower Concourse, 120 Broadway, New York, NY 10271

Remotely:
Watch the meeting on YouTube.

If you wish to testify at the meeting, in-person, or via zoom by computer, smartphone or tablet or via dial in, use this link to sign up *one hour or less before the meeting*: https://cpchearing.nyc.gov/Pages/Guest/SpeakerSignIn

If you do not wish to testify but would like to watch the meeting via livestream, please visit: bit.ly/NYCPlanningStream Watch the meeting on YouTube.


Via Phone
Dial any of the following numbers
877-853-5247 (US Toll-free)
888-788-0099 (US Toll-free) 
(253) 215-8782 (Toll number) 
(213) 338-8477 (Toll number) 

If you wish to listen only, when prompted, enter: 
Meeting ID: 880 8658 9511 
Participant ID: Press pound (#) to skip 
Passcode: 686997`;

interface CalendarEventParams {
  projectName: string;
  meetingDate: string; // Expected format "YYYY-MM-DD"
  locationDesc?: string;
}

/**
 * Format date string "YYYY-MM-DD" into "YYYYMMDD"
 */
function formatLocalDate(dateStr: string): string {
  // Strip any hyphens or slashes
  return dateStr.replace(/[-/]/g, "").trim();
}

/**
 * Generates a Google Calendar event URL
 */
export function getGoogleCalendarUrl({ projectName, meetingDate }: CalendarEventParams): string {
  const formattedDate = formatLocalDate(meetingDate);
  const title = encodeURIComponent(`${projectName} Hearing`);
  
  // 10:00 AM to 12:00 PM (100000 to 120000)
  const dates = `${formattedDate}T100000/${formattedDate}T120000`;
  const details = encodeURIComponent(EVENT_DESCRIPTION_TEMPLATE);
  const eventLocation = encodeURIComponent("City Planning Commission Hearing Room, Lower Concourse, 120 Broadway, New York, NY 10271");
  const ctz = "America/New_York";

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${eventLocation}&ctz=${ctz}`;
}

/**
 * Generates an ICS (iCal/Outlook) file data string
 */
export function getIcsContent({ projectName, meetingDate }: CalendarEventParams): string {
  const formattedDate = formatLocalDate(meetingDate);
  
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtStart = `${formattedDate}T100000`;
  const dtEnd = `${formattedDate}T120000`;
  const summary = `${projectName} Hearing`;
  
  // Escape special characters in description for ICS format
  const description = EVENT_DESCRIPTION_TEMPLATE
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");

  const location = "City Planning Commission Hearing Room\\, Lower Concourse\\, 120 Broadway\\, New York\\, NY 10271";
  const uid = `nyc-cpc-hearing-${formattedDate}-${encodeURIComponent(projectName.substring(0, 15))}-${Math.floor(Math.random() * 10000)}@nycplanning.gov`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NYC CPC Hearing Tracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=America/New_York:${dtStart}`,
    `DTEND;TZID=America/New_York:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

/**
 * Creates and triggers a download of the .ics file
 */
export function downloadIcsFile(params: CalendarEventParams) {
  const content = getIcsContent(params);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  const safeName = params.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.setAttribute("download", `${safeName}-hearing.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2026 NYC CPC / DCP Meeting Schedule (Every other Wednesday starting Jan 7, 2026, with skips)
 */
export const MEETING_DATES_2026 = [
  "2026-01-07",
  "2026-01-21",
  "2026-02-04",
  "2026-02-18",
  "2026-03-04",
  "2026-03-18",
  "2026-04-01",
  "2026-04-15",
  "2026-04-29",
  "2026-05-13",
  "2026-06-03", // Skips May 27, restarts June 3
  "2026-06-17",
  "2026-07-01",
  "2026-07-15",
  "2026-07-29",
  "2026-08-12",
  "2026-08-26",
  "2026-09-09",
  "2026-09-23",
  "2026-10-07",
  "2026-10-28", // Skips Oct 21, meets Oct 28
  "2026-11-18", // Skips Nov 11, restarts Nov 18
  "2026-12-02",
  "2026-12-16"  // Skips Dec 30
];

/**
 * Get next and previous meetings relative to current NYC time
 */
export function getMeetingsForContext(nowDateObj?: Date) {
  const now = nowDateObj || new Date();
  
  let nycDateStr = "";
  let nycHours = 12;
  try {
    const optionsStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
    const nycDate = new Date(optionsStr);
    const year = nycDate.getFullYear();
    const month = String(nycDate.getMonth() + 1).padStart(2, "0");
    const date = String(nycDate.getDate()).padStart(2, "0");
    nycDateStr = `${year}-${month}-${date}`;
    nycHours = nycDate.getHours();
  } catch (e) {
    // Fallback to local timezone representation
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    nycDateStr = `${year}-${month}-${date}`;
    nycHours = now.getHours();
  }

  // Find next upcoming meeting (either strictly in the future, or today if before 12:00 PM)
  const nextIdx = MEETING_DATES_2026.findIndex(d => {
    if (d > nycDateStr) return true;
    if (d === nycDateStr) {
      return nycHours < 12; // Meeting is 10:00 AM - 12:00 PM, so after 12 PM it's concluded
    }
    return false;
  });

  if (nextIdx === -1) {
    // Past the last meeting of 2026
    return {
      nextMeeting: MEETING_DATES_2026[MEETING_DATES_2026.length - 1],
      previousMeeting: MEETING_DATES_2026[MEETING_DATES_2026.length - 2]
    };
  }

  const nextMeeting = MEETING_DATES_2026[nextIdx];
  const previousMeeting = nextIdx > 0 ? MEETING_DATES_2026[nextIdx - 1] : MEETING_DATES_2026[0];

  return { nextMeeting, previousMeeting };
}

