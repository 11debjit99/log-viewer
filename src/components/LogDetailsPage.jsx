import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import '../styles.css'; // Corrected the import path for styles.css

const LogDetailsPage = () => {
    const { batchId, groupName } = useParams();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const url = `/api/logs?logGroup=${groupName}&batchId=${batchId}`;
                const response = await fetch(url);
                const data = await response.json();

                if (response.status !== 200) {
                    setError(data.error || 'Error fetching logs');
                    setLogs([]);
                } else {
                    setLogs(data.logs || []);
                    setError('');
                }
            } catch (err) {
                setError('Error fetching logs');
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [batchId, groupName]);

    return (
        <div className="log-details-container">
            <header>
                <h2>Logs for Batch ID: {batchId} in {groupName}</h2>
            </header>

            {loading && <p className="loading-message">Loading logs...</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="log-list">
                {logs.map((log, index) => (
                    <div key={index} className="log-entry">
                        <p><strong>Batch ID:</strong> {log.batchId}</p>
                        <p><strong>Date:</strong> {format(new Date(log.timestamp), 'MM/dd/yyyy, hh:mm a')}</p>
                        <p><strong>Message:</strong> {log.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LogDetailsPage;
