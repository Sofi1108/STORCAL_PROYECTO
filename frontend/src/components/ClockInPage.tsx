import { useEffect, useState } from "react";

export default function ClockInPage() {
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const employeeId = user?.id ?? 1;

    fetch(`${ROUTE}api/clock/status?employeeId=${employeeId}`)
      .then((r) => r.json())
      .then((data) => {
        setIsClockedIn(data.isClockedIn);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleClock = async () => {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const employeeId = user?.id ?? 1;

    try {
      const res = await fetch(`${ROUTE}api/clock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        `${isClockedIn ? "Salida" : "Entrada"} registrada a las ${timestamp}`
      );
    } catch (err) {
      setMessage("Error al conectar con el servidor");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="clock-page">
      <h2>Fichajes</h2>
      <div className="clock-form">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Incidencia opcional"
        />
        <button onClick={handleClock}>
          {isClockedIn ? "Fichar salida" : "Fichar entrada"}
        </button>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}
