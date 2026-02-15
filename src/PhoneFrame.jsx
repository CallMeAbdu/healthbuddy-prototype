import { useEffect, useState } from "react";
import "./PhoneFrame.css";

export default function PhoneFrame({ children, darkMode = false, inline = false }) {
  const [time, setTime] = useState(formatTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={inline ? "phone-page phone-page-inline" : "phone-page"}>
      <div className="phone-shell" aria-label="Phone emulator frame">
        <div className={darkMode ? "phone-screen dark-mode" : "phone-screen"}>
          <div className="phone-status-bar" aria-hidden="true">
            <span className="phone-time">{time}</span>
            <span className="phone-status-icons">
              <span className="phone-signal">
                <span className="phone-signal-bar" />
                <span className="phone-signal-bar" />
                <span className="phone-signal-bar" />
              </span>
              <span className="phone-battery">
                <span className="phone-battery-level" />
              </span>
            </span>
          </div>

          <div className="phone-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

function formatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
