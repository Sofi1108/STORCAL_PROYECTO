import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";

export default function ClockInPage() {
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;
  const { customer } = useUser();

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const employeeId = customer?.id ?? 1;

    fetch(`${ROUTE}api/clock/status?employeeId=${employeeId}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        setIsClockedIn(data.isClockedIn);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customer]);

  const handleClock = async () => {
    const employeeId = customer?.id ?? 1;

    try {
      const res = await fetch(`${ROUTE}api/clock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeId,
          type: isClockedIn ? "out" : "in",
          note: note || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`Error: ${data.error}`);
        return;
      }

      setIsClockedIn(!isClockedIn);
      setNote("");
      const timestamp = new Date(data.event.recorded_at).toLocaleTimeString();
      setMessage(
        `${isClockedIn ? "Salida" : "Entrada"} registrada a las ${timestamp}`,
      );
    } catch (err) {
      setMessage("Error al conectar con el servidor");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="clock-in-page">
      <h2>Fichajes</h2>
      <div className="clock-status">
        <span
          className={`status-badge ${isClockedIn ? "clocked-in" : "clocked-out"}`}
        >
          {isClockedIn ? "Fichado dentro" : "Fichado fuera"}
        </span>
      </div>
      <div className="note-section">
        <label htmlFor="note">Nota (opcional)</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Incidencia opcional"
        />
      </div>
      <div className="clock-controls">
        <button
          className={`clock-button ${isClockedIn ? "clock-out" : "clock-in"}`}
          onClick={handleClock}
        >
          {isClockedIn ? "Fichar salida" : "Fichar entrada"}
        </button>
      </div>
      {message && (
        <p
          className={`message ${message.startsWith("Error") ? "error" : "success"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
