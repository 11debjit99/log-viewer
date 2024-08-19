import React, { useState, useEffect } from 'react';
import Modal from './components/Modal.jsx'; // Ensure the path and component are correct
import { parseISO, format } from 'date-fns';
import './styles.css'; // Ensure the path is correct

const App = () => {
    const [logGroups] = useState(['ExdionACE-JobPoller', 'AI_Engine', 'gateway']);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [jobsPosted, setJobsPosted] = useState(0);
    const [errors, setErrors] = useState(0);
    const [allLogs, setAllLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [detailedLogs, setDetailedLogs] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        applyFilter();
    }, [allLogs, filter]);

    const fetchLogs = async () => {
        if (!startDate || !endDate) {
            setSearchError('Please provide both start and end dates.');
            return;
        }
    
        setLoading(true);
        setSearchError('');
        setJobsPosted(0);
        setErrors(0);
        setAllLogs([]);
        setFilteredLogs([]);
        setDetailedLogs([]);
    
        try {
            const startTimestamp = new Date(startDate).getTime();
            const endDateObject = new Date(endDate);
            endDateObject.setHours(23, 59, 59, 999); // End of the selected day
            const endTimestamp = endDateObject.getTime();
    
            console.log('Start timestamp:', startTimestamp);
            console.log('End timestamp:', endTimestamp);
    
            let mergedLogs = [];
    
            for (const logGroup of logGroups) {
                const url = `/api/logs?logGroup=${logGroup}&startDate=${startDate}&endDate=${endDate}`;
                const response = await fetch(url);
                const data = await response.json();
    
                if (response.status !== 200) {
                    setSearchError(data.error || `Error fetching logs for ${logGroup}`);
                    continue;
                }
    
                if (!Array.isArray(data.logs)) {
                    setSearchError(`Invalid log data format received for ${logGroup}`);
                    continue;
                }
    
                // Filter logs by timestamp
                const filteredData = data.logs.filter(log => {
                    const logTimestamp = new Date(log.timestamp).getTime();
                    return logTimestamp >= startTimestamp && logTimestamp <= endTimestamp;
                });
    
                mergedLogs = [...mergedLogs, ...filteredData];
            }
    
            if (mergedLogs.length === 0) {
                setSearchError('No logs found for the selected date range.');
                setJobsPosted(0);
                setErrors(0);
                setAllLogs([]);
                setDetailedLogs([]);
            } else {
                const posted = mergedLogs.filter(log => log.logStream && log.logStream.includes('info')).length;
                const error = mergedLogs.filter(log => log.logStream && log.logStream.includes('error')).length;
                setJobsPosted(posted);
                setErrors(error);
                setAllLogs(mergedLogs);
                setFilteredLogs(mergedLogs);
                setSearchError('');
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
            setSearchError('Error fetching logs for the selected date range.');
            setJobsPosted(0);
            setErrors(0);
            setAllLogs([]);
            setDetailedLogs([]);
        } finally {
            setLoading(false);
        }
    };
    
    const extractDateFromMessage = (message) => {
        const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [APM]{2})/;
        const match = message.match(datePattern);
        return match ? new Date(match[0]) : null;
    };

    const formatDate = (log) => {
        const extractedDate = extractDateFromMessage(log.message);
        if (extractedDate) {
            return format(extractedDate, 'MM/dd/yyyy, hh:mm a');
        }
        const timestampDate = parseISO(new Date(log.timestamp).toISOString());
        return format(timestampDate, 'MM/dd/yyyy, hh:mm a');
    };

    const categorizeBatchIDs = (logs) => {
        const categorized = {};
    
        logs.forEach(log => {
            const { batchId, logGroupName, logStream, message, timestamp } = log;
    
            if (!categorized[batchId]) {
                categorized[batchId] = {
                    Job_Poller: { status: 'Not Present', timestamp: 0, date: '' },
                    AI_Engine: { status: 'Not Present', timestamp: 0 },
                    Gateway: { status: 'Not Present', timestamp: 0 }
                };
            }
    
            const isFailure = (logStream && logStream.toLowerCase().includes('error')) ||
                              (message && message.toLowerCase().includes('error'));
            const status = isFailure ? 'Failure' : 'Success';
            const logTimestamp = new Date(timestamp).getTime();
            const logDate = formatDate(log);
    
            if (logGroupName === 'ExdionACE-JobPoller') {
                if (logTimestamp > categorized[batchId].Job_Poller.timestamp) {
                    categorized[batchId].Job_Poller = { status, timestamp: logTimestamp, date: logDate };
                }
            } else if (logGroupName === 'gateway') {
                if (logTimestamp > categorized[batchId].Gateway.timestamp) {
                    categorized[batchId].Gateway = { status, timestamp: logTimestamp };
                }
            } else if (logGroupName === 'AI_Engine') {
                if (logTimestamp > categorized[batchId].AI_Engine.timestamp) {
                    categorized[batchId].AI_Engine = { status, timestamp: logTimestamp };
                }
            }
        });
    
        console.log('Categorized Batch IDs:', categorized);
        return categorized;
    };
    
    const filterBatchIDs = (categorized) => {
        const filtered = {};

        for (const batchId in categorized) {
            if (
                categorized[batchId].Job_Poller.status !== 'Not Present' && (
                    categorized[batchId].AI_Engine.status !== 'Not Present' ||
                    categorized[batchId].Gateway.status !== 'Not Present'
                )
            ) {
                filtered[batchId] = categorized[batchId];
            }
        }

        return filtered;
    };

    const applyFilter = () => {
        let logs = allLogs;
    
        // Categorize the logs by batch ID
        const categorized = categorizeBatchIDs(logs);
        
        let filteredBatchIds = {};
        
        if (filter === 'success') {
            // Filter batch IDs that have 'Success' in all three groups
            for (const batchId in categorized) {
                const batch = categorized[batchId];
                if (
                    batch.Job_Poller.status === 'Success' &&
                    batch.AI_Engine.status === 'Success' &&
                    batch.Gateway.status === 'Success'
                ) {
                    filteredBatchIds[batchId] = batch;
                }
            }
        } else if (filter === 'failure') {
            // Filter batch IDs that have 'Failure' in any group
            for (const batchId in categorized) {
                const batch = categorized[batchId];
                if (
                    batch.Job_Poller.status === 'Failure' ||
                    batch.AI_Engine.status === 'Failure' ||
                    batch.Gateway.status === 'Failure'
                ) {
                    filteredBatchIds[batchId] = batch;
                }
            }
        } else {
            // Show all logs if filter is 'all'
            filteredBatchIds = categorized;
        }
    
        // Convert filtered batch IDs to an array of logs
        const filteredLogs = [];
        for (const batchId in filteredBatchIds) {
            const batch = filteredBatchIds[batchId];
            filteredLogs.push(...logs.filter(log => log.batchId === batchId));
        }
    
        console.log('Filtered logs:', filteredLogs);
        setFilteredLogs(filteredLogs);
    };
    
    const renderBatchTable = () => {
        const categorized = categorizeBatchIDs(filteredLogs);
        const filtered = filterBatchIDs(categorized);
        const batchIds = Object.keys(filtered);

        return (
            <div className="batch-table">
                <table>
                    <thead>
                        <tr>
                            <th>Batch_ID</th>
                            <th>Date</th>
                            <th>Job_Poller</th>
                            <th>AI_Engine</th>
                            <th>Gateway</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batchIds.map(batchId => (
                            <tr key={batchId}>
                                <td>{batchId}</td>
                                <td>{filtered[batchId].Job_Poller.date}</td>
                                <td className={filtered[batchId].Job_Poller.status === 'Success' ? 'success' : 'failure'} onClick={() => handleBatchIdClick(batchId, 'ExdionACE-JobPoller')}>
                                    {filtered[batchId].Job_Poller.status}
                                </td>
                                <td className={filtered[batchId].AI_Engine.status === 'Success' ? 'success' : 'failure'} onClick={() => handleBatchIdClick(batchId, 'AI_Engine')}>
                                    {filtered[batchId].AI_Engine.status}
                                </td>
                                <td className={filtered[batchId].Gateway.status === 'Success' ? 'success' : 'failure'} onClick={() => handleBatchIdClick(batchId, 'gateway')}>
                                    {filtered[batchId].Gateway.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const handleBatchIdClick = (batchId, groupName) => {
        const filteredLogs = allLogs.filter(log => log.batchId === batchId && log.logGroupName === groupName);
        setDetailedLogs(filteredLogs);
        setSelectedBatchId(batchId);
        setModalTitle(`Logs for Batch ID: ${batchId} in ${groupName}`);
        setShowModal(true);
    };

    return (
        <div className="container">
    <header className="header">
        <h1>Log Viewer</h1>
        <div className="search-container">
            <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
            />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                    <button onClick={fetchLogs}>Fetch Logs</button>
                </div>
                {searchError && <p className="error-message">{searchError}</p>}
                {loading && <p className="loading-message">Loading logs...</p>}
            </header>
    
            <div className="filter-container">
                <label>
                    Filter:
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="failure">Failure</option>
                    </select>
                </label>
            </div>
    
            {renderBatchTable()}
            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                logs={detailedLogs}
                selectedBatchId={selectedBatchId}
                modalTitle={modalTitle}
            />
        </div>
    );
};

export default App;
