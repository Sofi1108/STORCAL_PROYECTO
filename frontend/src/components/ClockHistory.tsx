import { useEffect, useState } from "react";

interface DayGroup {
  in?: string;
  out?: string;
}

type Grouped = Record<string, DayGroup>;

export default function ClockHistory() {
  const PORT = 3000;
  const ROUTE = `http://localhost:${PORT}/`;

  const [grouped, setGrouped] = useState<Grouped>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const employeeId = user?.id ?? 1;

    fetch(`${ROUTE}api/clock/history?employeeId=${employeeId}`)
      .then((r) => r.json())
      .then((events) => {
        const grouped = events.reduce<Grouped>((acc, ev) => {
          const day = ev.recorded_at.slice(0, 10);
          if (!acc[day]) acc[day] = {};
          acc[day][ev.type] = ev.recorded_at;
          return acc;
        }, {});
        setGrouped(grouped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isComplete = (g: DayGroup) => !!g.in && !!g.out;

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="clock-history">
      <h2>Histórico de fichajes</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Entrada</th>
            <th>Salida</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([day, group]) => (
            <tr
              key={day}
              className={isComplete(group) ? "complete" : "incomplete"}
            >
              <td>{day}</td>
              <td>
                {group.in ? new Date(group.in).toLocaleTimeString() : "—"}
              </td>
              <td>
                {group.out ? new Date(group.out).toLocaleTimeString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
