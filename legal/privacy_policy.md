# Privacy Policy

**Effective Date: August 17, 2026**

MyCalendar is an open-source browser extension that helps San José State University students add their MyScheduler class schedules to Google Calendar or export them as an ICS file.

This policy explains what information MyCalendar accesses and how it is used.

## Information MyCalendar Accesses

### MyScheduler

MyCalendar uses your existing signed-in MyScheduler session to retrieve your class schedule. This may include:

- course names or codes;
- meeting dates and times; and
- building and room information.

This information is used only to generate calendar events or an ICS file. MyCalendar does not access or store your SJSU password.

### Google Calendar

If you choose to connect Google Calendar, MyCalendar uses Google OAuth to access:

- your Google account email address, so the extension can show which account is connected;
- events in your primary calendar, as needed to check whether matching class events already exist; and
- permission to create events in calendars you own.

When creating an event, MyCalendar sends the relevant class information, such as its name, time, and location, directly to Google Calendar.

Google Calendar access is optional. You can use the ICS export feature without connecting a Google account.

## How Your Information Is Handled

MyCalendar runs primarily in your browser. It does not send your schedule, Google Calendar data, or Google account information to the MyCalendar developer.

The extension stores limited information locally using browser extension storage, including your Google OAuth access token and the email address of the connected Google account. The OAuth token is used only to make authorized Google API requests on your behalf.

ICS files are also generated locally in your browser.

MyCalendar does **not**:

- sell or rent user information;
- use user information for advertising or profiling;
- use analytics, advertising, or third-party tracking services; or
- operate a server that stores users' schedules or Google Calendar data.

## Third-Party Services

MyCalendar communicates directly with services necessary to provide its features:

- **MyScheduler** to retrieve your class schedule using your existing authenticated session; and
- **Google** when you choose to connect Google Calendar.

These services are operated by third parties and have their own privacy practices.

## Google API Data

MyCalendar uses information obtained from Google APIs only to provide the Google Calendar features described above.

The use of information received from Google APIs will adhere to the **Google API Services User Data Policy**, including its Limited Use requirements.

The use of information received from Google APIs will also adhere to the **Chrome Web Store User Data Policy**, including the Limited Use requirements.

Google user data is not used for advertising, sold to third parties, or used for purposes unrelated to MyCalendar's user-facing functionality.

## Your Choices and Data Removal

You can revoke MyCalendar's Google access at any time through your Google Account settings.

You can remove information stored locally by MyCalendar by clearing the extension's data or uninstalling the extension.

Uninstalling MyCalendar or revoking its Google access does not automatically delete calendar events that were already created. Those events can be deleted directly in Google Calendar.

Previously exported ICS files also remain wherever you chose to save them until you delete them.

## Changes to This Policy

This policy may be updated if MyCalendar's features or data practices change. The effective date at the top of this page will be updated when changes are made.

## Contact

Questions or concerns about this Privacy Policy can be submitted through the MyCalendar GitHub repository:

**https://github.com/doperdoge/MyCalendar/**
