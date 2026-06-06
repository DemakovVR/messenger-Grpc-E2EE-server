import { useState, useEffect } from "react";
import { authApi } from "../api/authApi";
import { translateAuditLog } from "../utils/auditFormatter";
import "../styles/UserAuditPage.css";

export default function UserAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await authApi.getUserLogs();
        setLogs(data.logs || []);
      } catch (err) {
        setError("Не удалось загрузить историю действий");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="user-audit-page">
      <h2>История действий</h2>
      {loading && <div className="loading-text">Загрузка...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && (
        <div className="logs-table-container">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Действие</th>
                <th>Статус</th>
                <th>IP адрес</th>
                <th>Задержка</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">Нет записей</td>
                </tr>
              ) : (
                logs.map((rawLog) => {
                  // Безопасное извлечение объекта details
                  let detailsObj = {};
                  try {
                    detailsObj = typeof rawLog.details === "string" 
                      ? JSON.parse(rawLog.details || "{}") 
                      : (rawLog.details || {});
                  } catch (e) {
                    console.warn("Ошибка парсинга details:", e);
                  }

                  // Подготовка данных для форматировщика
                  const log = translateAuditLog({
                    ...rawLog,
                    details: detailsObj
                  });

                  return (
                    <tr key={rawLog.id || Math.random()}>
                      <td style={{ whiteSpace: "nowrap" }}>{log.time}</td>
                      <td>
                        <div className="log-action-name">{String(log.action || "—")}</div>
                        {log.error && (
                          <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                            {String(log.error)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${log.statusBg || ""}`} style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>
                          {String(log.status || "—")}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>
                        {String(detailsObj.client_ip || "—")}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>
                        {String(detailsObj.duration || "—")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}