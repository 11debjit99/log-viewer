import React from 'react';
import '../styles/modal.css';
import { parse, format } from 'date-fns'; // Import parse and format from date-fns

// Utility function to extract date from message
const extractDateFromMessage = (message) => {
    // Adjusted pattern based on the date format in your message
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [APM]{2})/;
    const match = message.match(datePattern);
    if (match) {
        console.log('Extracted date string:', match[0]); // Debugging: log the extracted date string
        // Parse the date using the format that matches your date pattern
        return parse(match[0], 'M/d/yyyy h:mm:ss a', new Date());
    }
    return null;
};

const Modal = ({ show, onClose, logs, showPosted }) => {
    if (!show) {
        return null;
    }

    const handleClose = (e) => {
        e.stopPropagation();
        onClose();
    };

    return (
        <div className="modal" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h4 className="modal-title">{showPosted ? 'Jobs Posted' : 'Logs'}</h4>
                    <button className="close" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {logs.map((log, index) => {
                        // Extract date from the message
                        const extractedDate = extractDateFromMessage(log.message);
                        const displayDate = extractedDate ? format(extractedDate, 'M/d/yyyy h:mm:ss a') : 'Date not found';
                        console.log('Display date:', displayDate); // Debugging: log the display date
                        return (
                            <div key={index} className="log-entry">
                                <p><strong>Batch ID:</strong> {log.batchId}</p>
                                {/* Removed the date display */}
                                <p><strong>Message:</strong> {log.message}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="modal-footer">
                    <button className="button" onClick={handleClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
