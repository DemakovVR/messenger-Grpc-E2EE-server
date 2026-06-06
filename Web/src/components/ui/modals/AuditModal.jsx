import React, { useState, useEffect } from 'react';
import { grpcClient } from "../../../services/grpcClient";
import { GetUserLogsRequest } from '../../gen/audit/audit_pb';
import { translateAuditLog } from "../../../utils/auditFormatter";

export default function AuditModal({ isOpen, onClose, userId }) {
    const [rawLogsList, setRawLogsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !userId) return;

        const loadLogs = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const request = new GetUserLogsRequest();
                
                if (typeof request.setUserId === 'function') {
                    request.setUserId(userId);
                } else {
                    request.userId = userId;
                }

                const response = await grpcClient.getUserLogs(request, {});

                const fetchedLogs = typeof response.getLogsList === 'function' 
                    ? response.getLogsList() 
                    : (response.logs || []);
                
                setRawLogsList(fetchedLogs);

            } catch (err) {
                console.error("Ошибка при загрузке логов аудита через gRPC:", err);
                setError("Не удалось загрузить журнал безопасности");
            } finally {
                setIsLoading(false);
            }
        };

        loadLogs();
    }, [isOpen, userId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 flex flex-col max-h-[85vh]">
                
                <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800">
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        🛡️ Журнал безопасности и действий
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-2xl transition"
                    >
                        &times;
                    </button>
                </div>

                <div className="mt-4 overflow-y-auto flex-1 min-h-[300px] border dark:border-zinc-800 rounded">
                    {isLoading && (
                        <div className="flex h-full min-h-[300px] items-center justify-center text-zinc-500">
                            Загрузка истории действий...
                        </div>
                    )}

                    {error && (
                        <div className="flex h-full min-h-[300px] items-center justify-center text-red-500 font-medium">
                            {error}
                        </div>
                    )}

                    {!isLoading && !error && rawLogsList.length === 0 && (
                        <div className="flex h-full min-h-[300px] items-center justify-center text-zinc-500">
                            История действий пуста
                        </div>
                    )}

                    {!isLoading && !error && rawLogsList.length > 0 && (
                        <div className="overflow-x-auto min-w-full align-middle">
                            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-sm text-zinc-500 dark:text-zinc-400">
                                <thead className="bg-zinc-50 text-xs uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                    <tr>
                                        <th className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800">Дата и время</th>
                                        <th className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800">Действие</th>
                                        <th className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800">Статус</th>
                                        <th className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800">IP адрес</th>
                                        <th className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-right">Задержка</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                    {rawLogsList.map((item) => {
                                        const rawLog = typeof item.toObject === 'function' ? item.toObject() : item;

                                        let detailsObj = rawLog.details || item.getDetails?.();
                                        if (typeof detailsObj === 'string') {
                                            try {
                                                detailsObj = JSON.parse(detailsObj);
                                            } catch (e) {
                                                detailsObj = {};
                                            }
                                        }

                                        const preparedLog = {
                                            id: rawLog.id || item.getId?.(),
                                            action: rawLog.action || item.getAction?.(),
                                            details: detailsObj,
                                            createdAt: rawLog.createdAt || item.getCreatedAt?.()
                                        };

                                        const log = translateAuditLog(preparedLog);

                                        return (
                                            <tr key={log.id || Math.random()} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900 dark:text-white">
                                                    {log.time}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{log.action}</div>
                                                    {log.error && (
                                                        <span className="block text-xs text-red-500 dark:text-red-400 mt-0.5 max-w-xs truncate" title={log.error}>
                                                            {log.error}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.statusBg || 'bg-zinc-100 text-zinc-800'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                    {log.ip || "—"}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-zinc-400 dark:text-zinc-500">
                                                    {log.duration || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-4 border-t pt-3 flex justify-end dark:border-zinc-800">
                    <button
                        onClick={onClose}
                        className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                    >
                        Закрыть
                    </button>
                </div>

            </div>
        </div>
    );
}