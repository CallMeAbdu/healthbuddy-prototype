import { useEffect, useMemo, useRef, useState } from "react";
import PhoneFrame from "./PhoneFrame";
import "./App.css";

const APPOINTMENTS = [
  {
    id: "appt-1",
    type: "appointment",
    title: "Arthritis Follow-up",
    doctor: "Dr. Neil",
    specialty: "Rheumatology",
    date: "2026-02-16",
    time: "11:00",
    location: "Downtown Clinic",
    instructions: "Arrive 15 minutes early with your health card.",
    status: "Upcoming",
    notes: "Bring your current medication list and blood pressure notes.",
  },
];

const MEDICATIONS = [
  {
    id: "med-1",
    type: "medication",
    name: "Cortisone Pills",
    frequency: "Daily",
    time: "10:00",
    schedule: "Daily, 10:00",
    status: "Taken",
    dose: "1 tablet (20mg)",
    instructions: "Take after breakfast with water.",
    nextDose: "Tomorrow, 10:00",
    notes: "No grapefruit juice within 2 hours of dose.",
  },
  {
    id: "med-2",
    type: "medication",
    name: "Hypertension Pills",
    frequency: "Daily",
    time: "17:00",
    schedule: "Daily, 17:00",
    status: "Pending",
    dose: "1 tablet (10mg)",
    instructions: "Take in the evening. Avoid skipping doses.",
    nextDose: "Today, 17:00",
    notes: "Record blood pressure before taking medication.",
  },
];

const DOCTOR_CONVERSATIONS = [
  {
    id: "thread-neil",
    doctor: "Dr. Neil",
    specialty: "Rheumatology",
    message: "How are your joints feeling after the new medication schedule?",
    time: "9:18",
    unread: 2,
    online: true,
  },
  {
    id: "thread-khan",
    doctor: "Dr. Khan",
    specialty: "Family Medicine",
    message: "Please upload your latest blood pressure readings before Friday.",
    time: "Yesterday",
    unread: 1,
    online: false,
  },
  {
    id: "thread-choi",
    doctor: "Dr. Choi",
    specialty: "Cardiology",
    message: "ECG results look stable. Keep your current routine.",
    time: "Mon",
    unread: 0,
    online: false,
  },
];

const CONVERSATION_MESSAGES = {
  "thread-neil": [
    { id: "neil-1", sender: "doctor", text: "How are your joints feeling today?", time: "09:18" },
    { id: "neil-2", sender: "you", text: "Much better than last week, less morning stiffness.", time: "09:21" },
    { id: "neil-3", sender: "doctor", text: "Great. Keep the current dose and log symptoms for 3 days.", time: "09:24" },
  ],
  "thread-khan": [
    { id: "khan-1", sender: "doctor", text: "Please upload your latest blood pressure readings before Friday.", time: "Yesterday" },
    { id: "khan-2", sender: "you", text: "Will do. I will send today's and tomorrow's values.", time: "Yesterday" },
  ],
  "thread-choi": [
    { id: "choi-1", sender: "doctor", text: "ECG results look stable. Keep your current routine.", time: "Mon" },
    { id: "choi-2", sender: "you", text: "Thanks doctor, I will continue the same schedule.", time: "Mon" },
  ],
};

export default function App() {
  const [page, setPage] = useState("home");
  const [newEventType, setNewEventType] = useState("appointment");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(DOCTOR_CONVERSATIONS[0] ?? null);
  const [appointments, setAppointments] = useState(APPOINTMENTS);
  const [medications, setMedications] = useState(MEDICATIONS);
  const [darkMode, setDarkMode] = useState(false);
  const pageRef = useRef("home");
  const pageHistoryRef = useRef([]);

  const title = useMemo(() => {
    const map = {
      search: "Search",
      home: "Home",
      calendar: "Calendar",
      account: "Account",
      notifications: "Notifications",
      messages: "Messages",
      "new-event": "New Event",
      "event-details": "Event Details",
      "edit-event": "Edit Event",
    };
    return map[page];
  }, [page]);

  const notificationCount = useMemo(() => {
    const unreadConversations = DOCTOR_CONVERSATIONS.reduce((sum, thread) => sum + (thread.unread ?? 0), 0);
    const activeReminders = buildPushReminders(appointments, medications).length;
    return unreadConversations + activeReminders;
  }, [appointments, medications]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const goToPage = (nextPage) => {
    const currentPage = pageRef.current;
    const resolvedPage = typeof nextPage === "function" ? nextPage(currentPage) : nextPage;

    if (!resolvedPage || resolvedPage === currentPage) {
      return;
    }

    if (resolvedPage === "home") {
      pageHistoryRef.current = [];
    } else {
      pageHistoryRef.current.push(currentPage);
    }

    pageRef.current = resolvedPage;
    setPage(resolvedPage);
  };

  const goBack = () => {
    const history = pageHistoryRef.current;
    if (history.length === 0) {
      if (pageRef.current !== "home") {
        pageRef.current = "home";
        setPage("home");
      }
      return;
    }

    const previousPage = history.pop();
    pageRef.current = previousPage;
    setPage(previousPage);
  };

  const openEventDetails = (eventData) => {
    setSelectedEvent(eventData);
    goToPage("event-details");
  };

  const openConversation = (thread) => {
    setSelectedConversation(thread);
    goToPage("messages");
  };

  const handleCreateMedication = (formData) => {
    const name = formData.name.trim() || "New Medication";
    const dose = formData.dose.trim() || "1 dose";
    const time = formData.time.trim() || "10:00";
    const frequency = formData.frequency.trim() || "Daily";
    const notes = formData.notes.trim() || "No extra notes.";

    const createdMedication = {
      id: `med-${Date.now()}`,
      type: "medication",
      name,
      frequency,
      time,
      schedule: `${frequency}, ${time}`,
      status: "Pending",
      dose,
      instructions: "",
      nextDose: `Today, ${time}`,
      notes,
    };

    setMedications((current) => [...current, createdMedication]);
    setSelectedEvent(toDetailsEvent(createdMedication));
    goToPage("event-details");
  };

  const handleSaveEditedEvent = (updatedEvent) => {
    setSelectedEvent(updatedEvent);

    if (updatedEvent.type === "appointment") {
      setAppointments((current) =>
        current.map((item) =>
          item.id === updatedEvent.id
            ? {
                ...item,
                title: updatedEvent.eventName,
                doctor: updatedEvent.doctor,
                specialty: updatedEvent.specialty,
                date: updatedEvent.detailDate,
                time: updatedEvent.detailTime,
                location: updatedEvent.detailLocation,
                status: updatedEvent.status,
                instructions: updatedEvent.detailInstructions,
                notes: updatedEvent.notes,
              }
            : item,
        ),
      );
      return;
    }

    setMedications((current) =>
      current.map((item) =>
        item.id === updatedEvent.id
          ? {
              ...item,
              name: updatedEvent.eventName,
              dose: updatedEvent.medicationDose,
              time: updatedEvent.medicationTime,
              frequency: updatedEvent.medicationFrequency,
              schedule: updatedEvent.schedule,
              nextDose: updatedEvent.detailTime,
              status: updatedEvent.status,
              instructions: updatedEvent.detailInstructions ?? "",
              notes: updatedEvent.notes,
            }
          : item,
      ),
    );
  };

  const handleDeleteEvent = (eventData) => {
    if (!eventData) {
      return;
    }

    if (eventData.type === "appointment") {
      setAppointments((current) => current.filter((item) => item.id !== eventData.id));
    } else {
      setMedications((current) => current.filter((item) => item.id !== eventData.id));
    }

    setSelectedEvent(null);
    goToPage("home");
  };

  return (
    <div className="prototype-frames">
      <PhoneFrame inline>
        <main className="app-shell welcome-app-shell">
          <section className="page-body">
            <WelcomeAuthPage />
          </section>
        </main>
      </PhoneFrame>

      <PhoneFrame darkMode={darkMode} inline>
        <main className={darkMode ? "app-shell dark-mode" : "app-shell"}>
          <TopBar
            page={page}
            title={title}
            setPage={goToPage}
            onReturn={goBack}
            notificationCount={notificationCount}
          />

          <section className="page-body">
            {page === "search" && <SearchPage setPage={goToPage} />}
            {page === "home" && (
              <HomePage
                setPage={goToPage}
                openEventDetails={openEventDetails}
                appointments={appointments}
                medications={medications}
              />
            )}
            {page === "calendar" && (
              <CalendarPage
                setPage={goToPage}
                appointments={appointments}
                medications={medications}
                openEventDetails={openEventDetails}
              />
            )}
            {page === "account" && <AccountPage darkMode={darkMode} setDarkMode={setDarkMode} />}
            {page === "notifications" && (
              <NotificationsPage
                appointments={appointments}
                medications={medications}
                openConversation={openConversation}
              />
            )}
            {page === "messages" && <MessagesPage conversation={selectedConversation} />}
            {page === "new-event" && (
              <NewEventPage
                newEventType={newEventType}
                setNewEventType={setNewEventType}
                onCreateMedication={handleCreateMedication}
              />
            )}
            {page === "event-details" && (
              <EventDetailsPage
                eventData={selectedEvent}
                setPage={goToPage}
                openEditPage={() => goToPage("edit-event")}
              />
            )}
            {page === "edit-event" && (
              <EditEventPage
                eventData={selectedEvent}
                setPage={goToPage}
                onSave={handleSaveEditedEvent}
                onDelete={handleDeleteEvent}
              />
            )}
          </section>

          {["search", "home", "calendar"].includes(page) && <BottomNav page={page} setPage={goToPage} />}
        </main>
      </PhoneFrame>
    </div>
  );
}

function TopBar({ page, title, setPage, onReturn, notificationCount = 0 }) {
  const mainScreen = ["search", "home", "calendar"].includes(page);
  const subtitle = page === "home" ? "Good afternoon, Abdul" : "Health dashboard";
  const countLabel = notificationCount > 99 ? "99+" : String(notificationCount);

  if (!mainScreen) {
    return (
      <header className="top-bar compact-top">
        <button className="back-btn" type="button" onClick={onReturn}>
          <span className="back-arrow" aria-hidden="true">
            &larr;
          </span>
          <span>Return</span>
        </button>
        <h1 className="title-with-logo compact-title">
          <AppLogo name={page} className="title-logo" />
          {title}
        </h1>
      </header>
    );
  }

  return (
    <header className="top-bar">
      <div className="title-group">
        <h1 className="title-with-logo">
          <AppLogo name={page} className="title-logo" />
          {title}
        </h1>
        <p>{subtitle}</p>
      </div>
      <div className="top-actions">
        <button className="action-chip" type="button" onClick={() => setPage("account")}>
          <span className="chip-icon">
            <AppLogo name="account" />
          </span>
          <span className="chip-label">Account</span>
        </button>
        <button className="action-chip" type="button" onClick={() => setPage("notifications")}>
          <span className="chip-icon">
            <AppLogo name="notifications" />
            {notificationCount > 0 && <span className="notif-count">{countLabel}</span>}
          </span>
          <span className="chip-label">Notifications</span>
        </button>
      </div>
    </header>
  );
}

function SearchPage({ setPage }) {
  return (
    <div className="screen-panel">
      <div className="search-box">
        <input type="text" placeholder="Search doctors, meds, events" />
        <button type="button">
          <AppLogo name="search" className="search-btn-icon" />
          <span>Search</span>
        </button>
      </div>

      <div className="chip-row">
        {["Cardiology", "Medication", "Appointments"].map((label) => (
          <span key={label} className="tag-chip">
            {label}
          </span>
        ))}
      </div>

      <article className="list-card">
        <div>
          <strong>Recent search</strong>
          <p>Hypertension medication schedule</p>
        </div>
      </article>

      <article className="list-card">
        <div>
          <strong>Suggested action</strong>
          <p>Check upcoming events this week.</p>
        </div>
      </article>

      <button className="primary-pill add-event-btn mt-auto" type="button" onClick={() => setPage("new-event")}>
        + Add new event
      </button>
    </div>
  );
}

function HomePage({ setPage, openEventDetails, appointments, medications }) {
  return (
    <div className="screen-panel">
      <div className="week-strip">
        {[4, 5, 6, 7, 8, 9, 10].map((day) => (
          <button key={day} className={day === 7 ? "day-chip active-day" : "day-chip"} type="button">
            <span className="day-number">{day}</span>
            <span className="day-markers" aria-label={`Events for day ${day}`}>
              {buildEventDots(day, appointments, medications).map((dot, index) => (
                <span
                  // Each dot represents one event; color indicates event type.
                  key={`${day}-${dot}-${index}`}
                  className={dot === "appointment" ? "event-dot appointment-dot" : "event-dot medication-dot"}
                />
              ))}
            </span>
          </button>
        ))}
      </div>

      <h2>Upcoming Appointments</h2>
      {appointments.map((item) => (
        <article className="list-card" key={item.id}>
          <span className="type-badge appointment-badge" aria-hidden="true">
            <StethoscopeLogo />
          </span>
          <div>
            <strong>{item.title}</strong>
            <p>
              {item.doctor} | {formatDisplayDate(item.date)}, {item.time}
            </p>
            <small>{item.location}</small>
          </div>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => openEventDetails(toDetailsEvent(item))}
          >
            Details
          </button>
        </article>
      ))}

      <h2>Medications</h2>
      {medications.map((item) => (
        <article
          className={
            item.status === "Taken" ? "list-card medication-card medication-taken" : "list-card medication-card"
          }
          key={item.id}
        >
          <span className="type-badge medication-badge" aria-hidden="true">
            <span className="rx-mark">Rx</span>
          </span>
          <div>
            <strong>{item.name}</strong>
            <p>{item.schedule}</p>
          </div>
          <div className="card-actions">
            <span className={item.status === "Taken" ? "pill good" : "pill warn"}>{item.status}</span>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => openEventDetails(toDetailsEvent(item))}
            >
              Details
            </button>
          </div>
        </article>
      ))}

      <button className="primary-pill add-event-btn mt-auto" type="button" onClick={() => setPage("new-event")}>
        + Add new event
      </button>
    </div>
  );
}

function CalendarPage({ setPage, appointments, medications, openEventDetails }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1));
  const [selectedDateKey, setSelectedDateKey] = useState("2026-02-07");

  useEffect(() => {
    if (!isDateInMonth(selectedDateKey, currentMonth)) {
      setSelectedDateKey(createDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    }
  }, [currentMonth, selectedDateKey]);

  const firstWeekday = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const monthLabel = currentMonth.toLocaleDateString([], { month: "long", year: "numeric" });

  const getEventsForDate = (dateKey) => {
    const dateAppointments = appointments
      .filter((item) => item.date === dateKey)
      .map((item) => ({
        id: item.id,
        type: "appointment",
        time: item.time ?? "",
        source: item,
      }));

    const dailyMedications = medications
      .filter((item) => (item.frequency ?? "").toLowerCase().includes("daily"))
      .map((item) => ({
        id: `${item.id}-${dateKey}`,
        type: "medication",
        time: item.time ?? "",
        source: item,
      }));

    const parseTime = (timeValue) => {
      const parts = (timeValue ?? "").split(":");
      if (parts.length !== 2) {
        return Number.POSITIVE_INFINITY;
      }
      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return Number.POSITIVE_INFINITY;
      }
      return hours * 60 + minutes;
    };

    const typeRank = { appointment: 0, medication: 1 };
    return [...dateAppointments, ...dailyMedications].sort((a, b) => {
      const rankDiff = (typeRank[a.type] ?? 99) - (typeRank[b.type] ?? 99);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return parseTime(a.time) - parseTime(b.time);
    });
  };

  const eventsByDate = useMemo(() => {
    const map = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = createDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      map[dateKey] = getEventsForDate(dateKey);
    }
    return map;
  }, [appointments, medications, currentMonth, daysInMonth]);

  const selectedEvents = eventsByDate[selectedDateKey] ?? [];
  const selectedDateLabel = formatReadableDate(selectedDateKey);

  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, i) => ({ id: `empty-${i}`, empty: true })),
        ...Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateKey = createDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          return {
            id: dateKey,
            day,
            dateKey,
            events: eventsByDate[dateKey] ?? [],
          };
        }),
      ];

  const changeMonth = (offset) => {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="screen-panel">
      <div className="month-bar">
        <button className="icon-plain" type="button" onClick={() => changeMonth(-1)}>
          {"<"}
        </button>
        <strong>{monthLabel}</strong>
        <button className="icon-plain" type="button" onClick={() => changeMonth(1)}>
          {">"}
        </button>
      </div>

      <div className="weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
          <span key={`${label}-${i}`}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarCells.map((cell) =>
          cell.empty ? (
            <span key={cell.id} className="calendar-day empty-day" aria-hidden="true" />
          ) : (
            <button
              key={cell.id}
              type="button"
              className={selectedDateKey === cell.dateKey ? "calendar-day selected" : "calendar-day"}
              onClick={() => setSelectedDateKey(cell.dateKey)}
            >
              <span className="calendar-day-number">{cell.day}</span>
              <span className="calendar-day-dots" aria-hidden="true">
                {buildCalendarDots(cell.events).map((dot, index) => (
                  <span
                    key={`${cell.dateKey}-${dot}-${index}`}
                    className={dot === "appointment" ? "event-dot appointment-dot" : "event-dot medication-dot"}
                  />
                ))}
              </span>
            </button>
          ),
        )}
      </div>

      <article className="event-panel">
        <p className="event-title">{selectedDateLabel} (Selected day)</p>
        {selectedEvents.length > 0 ? (
          <div className="event-list">
            {selectedEvents.map((event) =>
              event.type === "appointment" ? (
                <article className="list-card" key={event.id}>
                  <span className="type-badge appointment-badge" aria-hidden="true">
                    <StethoscopeLogo />
                  </span>
                  <div>
                    <strong>{event.source.title}</strong>
                    <p>
                      {event.source.doctor} | {formatDisplayDate(event.source.date)}, {event.source.time}
                    </p>
                    <small>{event.source.location}</small>
                  </div>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => openEventDetails(toDetailsEvent(event.source))}
                  >
                    Details
                  </button>
                </article>
              ) : (
                <article
                  className={
                    event.source.status === "Taken"
                      ? "list-card medication-card medication-taken"
                      : "list-card medication-card"
                  }
                  key={event.id}
                >
                  <span className="type-badge medication-badge" aria-hidden="true">
                    <span className="rx-mark">Rx</span>
                  </span>
                  <div>
                    <strong>{event.source.name}</strong>
                    <p>{event.source.schedule}</p>
                  </div>
                  <div className="card-actions">
                    <span className={event.source.status === "Taken" ? "pill good" : "pill warn"}>
                      {event.source.status}
                    </span>
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => openEventDetails(toDetailsEvent(event.source))}
                    >
                      Details
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="event-item empty-event">No events for this day</div>
        )}
      </article>

      <button className="primary-pill add-event-btn mt-auto" type="button" onClick={() => setPage("new-event")}>
        + Add new event
      </button>
    </div>
  );
}

function AccountPage({ darkMode, setDarkMode }) {
  return (
    <div className="screen-panel">
      <article className="profile-card">
        <div className="avatar">AB</div>
        <div>
          <strong>Abdulah Ghulam Ali</strong>
          <p>Account owner</p>
        </div>
      </article>

      <article className="setting-card">
        <strong>Account Information</strong>
        <p>Email: abdulah@example.com</p>
        <p>Phone: +1 123-456-7890</p>
      </article>

      <article className="setting-card">
        <strong>App Settings</strong>
        <div className="setting-row">
          <span>Dark mode</span>
          <button
            className={darkMode ? "switch on" : "switch"}
            type="button"
            onClick={() => setDarkMode((current) => !current)}
          >
            <span />
          </button>
        </div>
        <div className="setting-row">
          <span>Reminder sound</span>
          <button className="setting-select-btn" type="button">
            Chime
          </button>
        </div>
      </article>

      <button className="logout-btn mt-auto" type="button">
        Log out
      </button>
    </div>
  );
}

function NotificationsPage({ appointments, medications, openConversation }) {
  const reminders = useMemo(() => buildPushReminders(appointments, medications), [appointments, medications]);
  const medicationReminderCount = reminders.filter((item) => item.type === "medication").length;
  const appointmentReminderCount = reminders.filter((item) => item.type === "appointment").length;

  return (
    <div className="screen-panel">
      <article className="messages-card">
        <div className="messages-head">
          <strong>Doctors messages</strong>
          <small>{DOCTOR_CONVERSATIONS.length} conversations</small>
        </div>

        <div className="messages-list">
          {DOCTOR_CONVERSATIONS.map((thread) => (
            <button className="message-thread" type="button" key={thread.id} onClick={() => openConversation(thread)}>
              <span className="thread-avatar" aria-hidden="true">
                {thread.doctor
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
                {thread.online && <span className="thread-online-dot" />}
              </span>

              <span className="thread-body">
                <strong>{thread.doctor}</strong>
                <small>{thread.specialty}</small>
                <p>{thread.message}</p>
              </span>

              <span className="thread-meta">
                <small>{thread.time}</small>
                {thread.unread > 0 && <span className="thread-unread">{thread.unread}</span>}
              </span>
            </button>
          ))}
        </div>
      </article>

      <p className="notifications-subtitle">Push reminders</p>
      {reminders.length > 0 ? (
        <div className="push-stack">
          {reminders.map((item) => (
            <article className="push-card" key={item.id}>
              <span
                className={item.type === "appointment" ? "type-badge appointment-badge push-badge" : "type-badge medication-badge push-badge"}
                aria-hidden="true"
              >
                {item.type === "appointment" ? <StethoscopeLogo /> : <span className="rx-mark">Rx</span>}
              </span>

              <div className="push-body">
                <div className="push-head">
                  <span className="push-app">HealthBuddy</span>
                  <span className="push-time">{item.timeLabel}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="setting-card">
          <strong>No active reminders</strong>
          <p>Push reminders for medications and appointments will show here.</p>
        </article>
      )}

      <article className="setting-card">
        <strong>Reminders center</strong>
        <p>{medicationReminderCount} medication reminders active</p>
        <p>{appointmentReminderCount} appointment reminders active</p>
      </article>
    </div>
  );
}

function MessagesPage({ conversation }) {
  if (!conversation) {
    return (
      <div className="screen-panel messages-page">
        <article className="setting-card">
          <strong>No conversation selected</strong>
          <p>Open a doctor thread from Notifications.</p>
        </article>
      </div>
    );
  }

  const threadMessages = CONVERSATION_MESSAGES[conversation.id] ?? [];

  return (
    <div className="screen-panel messages-page">
      <article className="chat-header-card">
        <span className="thread-avatar chat-avatar" aria-hidden="true">
          {conversation.doctor
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
          {conversation.online && <span className="thread-online-dot" />}
        </span>
        <div>
          <strong>{conversation.doctor}</strong>
          <p>{conversation.specialty}</p>
        </div>
      </article>

      <div className="chat-stream">
        {threadMessages.map((message) => (
          <div className={message.sender === "doctor" ? "chat-row doctor-row" : "chat-row user-row"} key={message.id}>
            <article className={message.sender === "doctor" ? "chat-bubble doctor-bubble" : "chat-bubble user-bubble"}>
              <p>{message.text}</p>
            </article>
            <small>{message.time}</small>
          </div>
        ))}
      </div>

      <div className="chat-compose">
        <input type="text" value="" placeholder="Type a message..." readOnly />
        <button type="button">Send</button>
      </div>
    </div>
  );
}

function WelcomeAuthPage() {
  const [authMode, setAuthMode] = useState("login");
  const isSignUp = authMode === "signup";

  return (
    <div className="screen-panel welcome-panel">
      <article className="welcome-hero">
        <h2>Welcome to HealthBuddy</h2>
        <p>Your care companion for appointments, medications, and daily reminders.</p>
      </article>

      <div className="welcome-tabs">
        <button
          className={isSignUp ? "welcome-tab" : "welcome-tab active"}
          type="button"
          onClick={() => setAuthMode("login")}
        >
          Log in
        </button>
        <button
          className={isSignUp ? "welcome-tab active" : "welcome-tab"}
          type="button"
          onClick={() => setAuthMode("signup")}
        >
          Sign up
        </button>
      </div>

      {isSignUp ? (
        <>
          <label className="form-field">
            <span>Full Name</span>
            <input type="text" placeholder="Abdulah Ghulam Ali" />
          </label>

          <label className="form-field">
            <span>Email</span>
            <input type="email" placeholder="name@email.com" />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input type="password" placeholder="Create password" />
          </label>

          <label className="form-field">
            <span>Confirm Password</span>
            <input type="password" placeholder="Re-enter password" />
          </label>
        </>
      ) : (
        <>
          <label className="form-field">
            <span>Email</span>
            <input type="email" placeholder="name@email.com" />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input type="password" placeholder="Enter password" />
          </label>
        </>
      )}

      <button className="primary-pill" type="button">
        {isSignUp ? "Create account" : "Continue"}
      </button>

      <button className="ghost-btn welcome-secondary-btn" type="button">
        {isSignUp ? "Sign up with Google" : "Continue with Google"}
      </button>
    </div>
  );
}

function NewEventPage({ newEventType, setNewEventType, onCreateMedication }) {
  const [medicationForm, setMedicationForm] = useState({
    name: "",
    dose: "",
    time: "",
    frequency: "Daily",
    notes: "",
  });

  const saveNewEvent = () => {
    if (newEventType === "medication") {
      onCreateMedication(medicationForm);
      setMedicationForm({
        name: "",
        dose: "",
        time: "",
        frequency: "Daily",
        notes: "",
      });
    }
  };

  return (
    <div className="screen-panel">
      <p className="form-title">What is the event?</p>

      <div className="segmented">
        <button
          className={newEventType === "appointment" ? "segment active" : "segment"}
          type="button"
          onClick={() => setNewEventType("appointment")}
        >
          <span className="segment-type-icon appointment-type-icon" aria-hidden="true">
            <StethoscopeLogo />
          </span>
          <span className="segment-label appointment-label">Appointment</span>
        </button>
        <button
          className={newEventType === "medication" ? "segment active" : "segment"}
          type="button"
          onClick={() => setNewEventType("medication")}
        >
          <span className="segment-type-icon medication-type-icon" aria-hidden="true">
            <span className="rx-mark">Rx</span>
          </span>
          <span className="segment-label medication-label">Medication</span>
        </button>
      </div>

      {newEventType === "appointment" ? (
        <>
          <label className="form-field">
            <span>Title</span>
            <input type="text" placeholder="Arthritis Follow-up" />
          </label>

          <label className="form-field">
            <span>Doctor or Specialist</span>
            <input type="text" placeholder="Dr. Jane Doe" />
          </label>

          <label className="form-field">
            <span>Health Specialty</span>
            <input type="text" placeholder="Rheumatology" />
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Date</span>
              <input type="text" placeholder="2026-02-16" />
            </label>
            <label className="form-field">
              <span>Time</span>
              <input type="text" placeholder="11:00" />
            </label>
          </div>

          <label className="form-field">
            <span>Location</span>
            <input type="text" placeholder="Downtown Clinic" />
          </label>

          <label className="form-field">
            <span>Instructions</span>
            <textarea rows={3} placeholder="Arrive 15 minutes early and bring health card." />
          </label>

          <label className="form-field">
            <span>Notes</span>
            <textarea rows={3} placeholder="Add extra notes..." />
          </label>
        </>
      ) : (
        <>
          <label className="form-field">
            <span>Medication Name</span>
            <input
              type="text"
              placeholder="Cortisone Pills"
              value={medicationForm.name}
              onChange={(e) => setMedicationForm((current) => ({ ...current, name: e.target.value }))}
            />
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Dose</span>
              <input
                type="text"
                placeholder="1 tablet (20mg)"
                value={medicationForm.dose}
                onChange={(e) => setMedicationForm((current) => ({ ...current, dose: e.target.value }))}
              />
            </label>
            <label className="form-field">
              <span>Time</span>
              <input
                type="text"
                placeholder="10:00"
                value={medicationForm.time}
                onChange={(e) => setMedicationForm((current) => ({ ...current, time: e.target.value }))}
              />
            </label>
          </div>

          <label className="form-field">
            <span>Frequency</span>
            <input
              type="text"
              placeholder="Daily"
              value={medicationForm.frequency}
              onChange={(e) => setMedicationForm((current) => ({ ...current, frequency: e.target.value }))}
            />
          </label>

          <label className="form-field">
            <span>Notes</span>
            <textarea
              rows={3}
              placeholder="Add medication notes..."
              value={medicationForm.notes}
              onChange={(e) => setMedicationForm((current) => ({ ...current, notes: e.target.value }))}
            />
          </label>
        </>
      )}

      <button className="primary-pill new-event-save-btn" type="button" onClick={saveNewEvent}>
        <span className="details-btn-content">
          <AppLogo name="save" className="details-btn-icon" />
          Save event
        </span>
      </button>
    </div>
  );
}

function EventDetailsPage({ eventData, setPage, openEditPage }) {
  if (!eventData) {
    return (
      <div className="screen-panel details-page">
        <article className="details-note">
          <strong>No event selected</strong>
          <p>Choose an event and tap Details from the Home page.</p>
        </article>
        <button className="primary-pill" type="button" onClick={() => setPage("home")}>
          Back to Home
        </button>
      </div>
    );
  }

  const isMedication = eventData.type === "medication";
  const statusValue = eventData.status ?? "Scheduled";
  const isMedicationTaken = isMedication && statusValue === "Taken";
  const notesValue = eventData.notes ?? "No extra notes.";
  const statusActionLabel = isMedication ? "Mark as taken" : "Mark as attended";

  return (
    <div className="screen-panel details-page">
      <article className={isMedication ? "details-hero medication-hero" : "details-hero appointment-hero"}>
        <span className={isMedication ? "type-badge medication-badge" : "type-badge appointment-badge"}>
          {isMedication ? <span className="rx-mark">Rx</span> : <StethoscopeLogo />}
        </span>
        <div>
          <p className="details-type">{eventData.typeLabel}</p>
          <h2 className="details-title">{eventData.eventName}</h2>
          <p className="details-subtitle">{eventData.summary}</p>
        </div>
      </article>

      <div className="details-grid">
        {isMedication ? (
          <>
            <article className="detail-item">
              <span>Medication Name</span>
              <strong>{eventData.eventName}</strong>
            </article>
            <article className="detail-item">
              <span>Dose</span>
              <strong>{eventData.medicationDose}</strong>
            </article>
            <article className="detail-item">
              <span>Time</span>
              <strong>{eventData.medicationTime}</strong>
            </article>
            <article className="detail-item">
              <span>Frequency</span>
              <strong>{eventData.medicationFrequency}</strong>
            </article>
          </>
        ) : (
          <>
            <article className="detail-item">
              <span>Status</span>
              <strong>{statusValue}</strong>
              <button className="status-action-btn" type="button">
                {statusActionLabel}
              </button>
            </article>
            <article className="detail-item">
              <span>Doctor or Specialist</span>
              <strong>{eventData.doctor}</strong>
            </article>
            <article className="detail-item">
              <span>Health Specialty</span>
              <strong>{eventData.specialty}</strong>
            </article>
            <article className="detail-item">
              <span>Date and Time</span>
              <strong>
                {formatDisplayDate(eventData.detailDate)} | {eventData.detailTime}
              </strong>
            </article>
            <article className="detail-item">
              <span>Location</span>
              <strong>{eventData.detailLocation}</strong>
            </article>
          </>
        )}
      </div>

      {!isMedication && (
        <article className="details-note">
          <strong>Instructions</strong>
          <p>{eventData.detailInstructions}</p>
        </article>
      )}

      <article className="details-note">
        <strong>Notes</strong>
        <p>{notesValue}</p>
      </article>

      {isMedication && (
        <div className="details-med-actions">
          <button className="ghost-btn details-action-btn" type="button">
            <span className="details-btn-content">
              <AppLogo name="renew" className="details-btn-icon" />
              Renew
            </span>
          </button>
          <button
            className={
              isMedicationTaken
                ? "taken-btn details-action-btn"
                : "primary-pill details-action-btn mark-taken-btn"
            }
            type="button"
            disabled={isMedicationTaken}
          >
            <span className="details-btn-content">
              <AppLogo name="check" className="details-btn-icon" />
              {isMedicationTaken ? "Taken" : statusActionLabel}
            </span>
          </button>
        </div>
      )}

      <div className="details-actions">
        <button className="ghost-btn details-action-btn" type="button" onClick={() => setPage("home")}>
          <span className="details-btn-content">
            <AppLogo name="home" className="details-btn-icon" />
            Back to Home
          </span>
        </button>
        <button className="primary-pill details-action-btn" type="button" onClick={openEditPage}>
          <span className="details-btn-content">
            <AppLogo name="edit-event" className="details-btn-icon" />
            Edit event
          </span>
        </button>
      </div>
    </div>
  );
}

function EditEventPage({ eventData, setPage, onSave, onDelete }) {
  const [form, setForm] = useState(createEditForm(eventData));

  useEffect(() => {
    setForm(createEditForm(eventData));
  }, [eventData]);

  if (!eventData) {
    return (
      <div className="screen-panel details-page">
        <article className="details-note">
          <strong>No event selected</strong>
          <p>Open an event details page first.</p>
        </article>
        <button className="ghost-btn details-action-btn" type="button" onClick={() => setPage("home")}>
          Back to Home
        </button>
      </div>
    );
  }

  const isMedication = eventData.type === "medication";

  const saveChanges = () => {
    const updated = toUpdatedEvent(eventData, form);
    onSave(updated);
    setPage("event-details");
  };

  return (
    <div className="screen-panel edit-page">
      <p className="form-title">Update event details</p>

      <label className="form-field">
        <span>{isMedication ? "Medication Name" : "Title"}</span>
        <input
          type="text"
          value={form.eventName}
          onChange={(e) => setForm((current) => ({ ...current, eventName: e.target.value }))}
        />
      </label>

      <label className="form-field">
        <span>{isMedication ? "Dose" : "Doctor or Specialist"}</span>
        <input
          type="text"
          value={isMedication ? form.medicationDose : form.doctor}
          onChange={(e) =>
            setForm((current) =>
              isMedication
                ? { ...current, medicationDose: e.target.value }
                : { ...current, doctor: e.target.value },
            )
          }
        />
      </label>

      <div className="form-grid">
        <label className="form-field">
          <span>{isMedication ? "Time" : "Health Specialty"}</span>
          <input
            type="text"
            value={isMedication ? form.medicationTime : form.specialty}
            onChange={(e) =>
              setForm((current) =>
                isMedication
                  ? { ...current, medicationTime: e.target.value }
                  : { ...current, specialty: e.target.value },
              )
            }
          />
        </label>
        <label className="form-field">
          <span>{isMedication ? "Frequency" : "Date"}</span>
          <input
            type="text"
            value={isMedication ? form.medicationFrequency : form.detailDate}
            onChange={(e) =>
              setForm((current) =>
                isMedication
                  ? { ...current, medicationFrequency: e.target.value }
                  : { ...current, detailDate: e.target.value },
              )
            }
          />
        </label>
      </div>

      {isMedication && (
        <label className="form-field">
          <span>Notes</span>
          <textarea rows={4} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
        </label>
      )}

      {!isMedication && (
        <div className="form-grid">
          <label className="form-field">
            <span>Time</span>
            <input
              type="text"
              value={form.detailTime}
              onChange={(e) => setForm((current) => ({ ...current, detailTime: e.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>Location</span>
            <input
              type="text"
              value={form.detailLocation}
              onChange={(e) => setForm((current) => ({ ...current, detailLocation: e.target.value }))}
            />
          </label>
        </div>
      )}

      {!isMedication && (
        <>
          <label className="form-field">
            <span>Instructions</span>
            <textarea
              rows={4}
              value={form.detailInstructions}
              onChange={(e) => setForm((current) => ({ ...current, detailInstructions: e.target.value }))}
            />
          </label>

          <label className="form-field">
            <span>Notes</span>
            <textarea rows={4} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
          </label>
        </>
      )}

      <div className="edit-actions">
        <button className="primary-pill details-action-btn" type="button" onClick={saveChanges}>
          <span className="details-btn-content">
            <AppLogo name="save" className="details-btn-icon" />
            Save changes
          </span>
        </button>
        <button className="delete-btn details-action-btn" type="button" onClick={() => onDelete(eventData)}>
          <span className="details-btn-content">
            <AppLogo name="trash" className="details-btn-icon" />
            Delete event
          </span>
        </button>
      </div>
    </div>
  );
}

function BottomNav({ page, setPage }) {
  const items = [
    { id: "search", label: "Search", iconName: "search" },
    { id: "home", label: "Home", iconName: "home" },
    { id: "calendar", label: "Calendar", iconName: "calendar" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={page === item.id ? "nav-item active-nav" : "nav-item"}
          onClick={() => setPage(item.id)}
        >
          <span className="nav-icon">
            <AppLogo name={item.iconName} />
          </span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function buildEventDots(day, appointments = [], medications = []) {
  const homeYear = 2026;
  const homeMonthIndex = 1;

  const appointmentCount = appointments.filter((item) => {
    if (!item.date) {
      return false;
    }
    const parsed = parseDateKey(item.date);
    return parsed.year === homeYear && parsed.monthIndex === homeMonthIndex && parsed.day === day;
  }).length;

  const medicationCount = medications.filter((item) => {
    const frequency = (item.frequency ?? "").toLowerCase();
    return frequency.includes("daily");
  }).length;

  return [
    ...Array.from({ length: appointmentCount }, () => "appointment"),
    ...Array.from({ length: medicationCount }, () => "medication"),
  ];
}

function buildCalendarDots(events) {
  const appointmentDots = events.filter((event) => event.type === "appointment").map(() => "appointment");
  const medicationDots = events.filter((event) => event.type === "medication").map(() => "medication");
  return [...appointmentDots, ...medicationDots].slice(0, 3);
}

function buildPushReminders(appointments = [], medications = []) {
  const appointmentReminders = appointments
    .filter((item) => (item.status ?? "").toLowerCase() !== "attended")
    .map((item) => ({
      id: `push-appt-${item.id}`,
      type: "appointment",
      title: "Appointment reminder",
      body: `${item.title} with ${item.doctor} at ${item.location}.`,
      timeLabel: formatReminderLabel(item.date, item.time),
    }));

  const medicationReminders = medications
    .filter((item) => (item.status ?? "").toLowerCase() !== "taken")
    .map((item) => ({
      id: `push-med-${item.id}`,
      type: "medication",
      title: "Medication alarm",
      body: `${item.name} (${item.dose}) at ${item.time}.`,
      timeLabel: item.nextDose ?? formatReminderLabel(undefined, item.time),
    }));

  return [...appointmentReminders, ...medicationReminders];
}

function formatReminderLabel(dateString, timeString) {
  if (!dateString) {
    return timeString ? `Today, ${timeString}` : "Soon";
  }

  const [year, month, day] = dateString.split("-").map((n) => Number(n));
  const eventDate = new Date(year, month - 1, day);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfEvent = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const diffDays = Math.round((startOfEvent - startOfToday) / 86400000);

  if (diffDays === 0) {
    return timeString ? `Today, ${timeString}` : "Today";
  }
  if (diffDays === 1) {
    return timeString ? `Tomorrow, ${timeString}` : "Tomorrow";
  }
  return timeString ? `${formatDisplayDate(dateString)}, ${timeString}` : formatDisplayDate(dateString);
}

function createDateKey(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");
  return `${year}-${month}-${dayString}`;
}

function isDateInMonth(dateKey, monthDate) {
  const parsed = parseDateKey(dateKey);
  return parsed.year === monthDate.getFullYear() && parsed.monthIndex === monthDate.getMonth();
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map((n) => Number(n));
  return { year, monthIndex: month - 1, day };
}

function formatReadableDate(dateKey) {
  const parsed = parseDateKey(dateKey);
  const date = new Date(parsed.year, parsed.monthIndex, parsed.day);
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function toDetailsEvent(item) {
  if (item.type === "medication") {
    return {
      ...item,
      eventName: item.name,
      summary: `${item.dose} | ${item.time ?? item.nextDose}`,
      typeLabel: "Medication",
      medicationDose: item.dose,
      medicationTime: item.time ?? item.nextDose,
      medicationFrequency: item.frequency ?? item.schedule,
      // Keep legacy fields for existing edit-page bindings.
      schedule: item.schedule ?? `${item.frequency ?? "Daily"}, ${item.time ?? ""}`,
      detailTime: item.nextDose,
      detailLocation: item.detailLocation ?? "Home",
      detailInstructions: item.instructions ?? "",
      notes: item.notes ?? "No extra notes.",
    };
  }

  return {
      ...item,
      eventName: item.title,
      summary: `${item.doctor} | ${formatDisplayDate(item.date)}, ${item.time}`,
      typeLabel: "Appointment",
      doctor: item.doctor,
      specialty: item.specialty,
      detailDate: item.date,
      detailTime: item.time,
      detailLocation: item.location,
      detailInstructions: item.instructions,
      notes: item.notes ?? "No extra notes.",
    };
}

function createEditForm(eventData) {
  if (!eventData) {
    return {
      eventName: "",
      schedule: "",
      medicationDose: "",
      medicationTime: "",
      medicationFrequency: "",
      doctor: "",
      specialty: "",
      detailDate: "",
      detailTime: "",
      detailLocation: "",
      detailInstructions: "",
      notes: "",
    };
  }

  return {
    eventName: eventData.eventName ?? "",
    schedule: eventData.schedule ?? "",
    medicationDose: eventData.medicationDose ?? "",
    medicationTime: eventData.medicationTime ?? "",
    medicationFrequency: eventData.medicationFrequency ?? "",
    doctor: eventData.doctor ?? "",
    specialty: eventData.specialty ?? "",
    detailDate: eventData.detailDate ?? "",
    detailTime: eventData.detailTime ?? "",
    detailLocation: eventData.detailLocation ?? "",
    detailInstructions: eventData.detailInstructions ?? "",
    notes: eventData.notes ?? "",
  };
}

function toUpdatedEvent(currentEvent, form) {
  if (currentEvent.type === "medication") {
    const schedule = `${form.medicationFrequency}, ${form.medicationTime}`;
    return {
      ...currentEvent,
      eventName: form.eventName,
      medicationDose: form.medicationDose,
      medicationTime: form.medicationTime,
      medicationFrequency: form.medicationFrequency,
      schedule,
      status: currentEvent.status,
      detailTime: `Today, ${form.medicationTime}`,
      detailLocation: currentEvent.detailLocation ?? "Home",
      detailInstructions: currentEvent.detailInstructions ?? "",
      notes: form.notes,
      summary: `${form.medicationDose} | ${form.medicationTime}`,
    };
  }

  return {
    ...currentEvent,
    eventName: form.eventName,
    doctor: form.doctor,
    specialty: form.specialty,
    status: currentEvent.status,
    detailDate: form.detailDate,
    detailTime: form.detailTime,
    detailLocation: form.detailLocation,
    detailInstructions: form.detailInstructions,
    notes: form.notes,
    summary: `${form.doctor} | ${formatDisplayDate(form.detailDate)}, ${form.detailTime}`,
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "";
  }
  const [year, month, day] = dateString.split("-").map((n) => Number(n));
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StethoscopeLogo() {
  return (
    <svg
      className="stethoscope-mark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4v5a4 4 0 0 0 8 0V4" />
      <path d="M9 4v4" />
      <path d="M15 4v4" />
      <path d="M15 13v2a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3v-1.5" />
      <circle cx="21" cy="13.5" r="1.6" />
    </svg>
  );
}

function AppLogo({ name, className = "" }) {
  const iconProps = {
    className: `app-logo ${className}`.trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "search") {
    return (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="6" />
        <line x1="16.2" y1="16.2" x2="21" y2="21" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="8" y1="3.5" x2="8" y2="7" />
        <line x1="16" y1="3.5" x2="16" y2="7" />
      </svg>
    );
  }

  if (name === "account") {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 19c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" />
      </svg>
    );
  }

  if (name === "notifications") {
    return (
      <svg {...iconProps}>
        <path d="M6.8 16h10.4l-1.2-2.3V10c0-2.5-1.7-4.5-4-5.1V4a1 1 0 0 0-2 0v.9c-2.3.6-4 2.6-4 5.1v3.7L6.8 16z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
    );
  }

  if (name === "messages") {
    return (
      <svg {...iconProps}>
        <path d="M5 7.5A3.5 3.5 0 0 1 8.5 4h7A3.5 3.5 0 0 1 19 7.5v5A3.5 3.5 0 0 1 15.5 16H10l-4 3v-3.3A3.5 3.5 0 0 1 5 12.5z" />
      </svg>
    );
  }

  if (name === "event-details") {
    return (
      <svg {...iconProps}>
        <rect x="4" y="3.8" width="16" height="17" rx="2.8" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="13" y2="16" />
      </svg>
    );
  }

  if (name === "edit-event") {
    return (
      <svg {...iconProps}>
        <path d="M4 19.5h4.6l9.3-9.3-4.6-4.6L4 14.9z" />
        <path d="m11.9 7.2 4.6 4.6" />
      </svg>
    );
  }

  if (name === "renew") {
    return (
      <svg {...iconProps}>
        <path d="M20 12a8 8 0 0 1-13.7 5.6" />
        <polyline points="5 20 6.3 16.8 9.6 18.1" />
        <path d="M4 12a8 8 0 0 1 13.7-5.6" />
        <polyline points="19 4 17.7 7.2 14.4 5.9" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...iconProps}>
        <polyline points="5 13 10 18 19 7" />
      </svg>
    );
  }

  if (name === "save") {
    return (
      <svg {...iconProps}>
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4" />
        <rect x="8" y="14" width="8" height="4" rx="1" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...iconProps}>
        <polyline points="4 7 20 7" />
        <path d="M8 7V5h8v2" />
        <path d="M7 7l1 12h8l1-12" />
        <line x1="10" y1="10" x2="10.5" y2="17" />
        <line x1="14" y1="10" x2="13.5" y2="17" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6h-3.6v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
