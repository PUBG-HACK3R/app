"use client";

import { useEffect, useState } from "react";

interface TimezoneDateProps {
  dateString: string;
  className?: string;
}

export function TimezoneDate({ dateString, className = "" }: TimezoneDateProps) {
  const [formattedDate, setFormattedDate] = useState<string>("");

  useEffect(() => {
    // Format date on client side to ensure correct timezone
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      setFormattedDate("Invalid Date");
      return;
    }

    // Format with user's local timezone
    const formatted = date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24-hour format
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    setFormattedDate(formatted);
  }, [dateString]);

  // Show loading state while formatting
  if (!formattedDate) {
    return <span className={`${className} animate-pulse bg-gray-700 rounded`}>Loading...</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}

// Alternative component that shows both date and time separately
export function TimezoneDateTime({ dateString, className = "" }: TimezoneDateProps) {
  const [dateInfo, setDateInfo] = useState<{date: string, time: string} | null>(null);

  useEffect(() => {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      setDateInfo({ date: "Invalid", time: "Date" });
      return;
    }

    const dateFormatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    setDateInfo({ date: dateFormatted, time: timeFormatted });
  }, [dateString]);

  if (!dateInfo) {
    return <span className={`${className} animate-pulse bg-gray-700 rounded`}>Loading...</span>;
  }

  return (
    <span className={className}>
      <div className="text-xs text-gray-400">{dateInfo.date}</div>
      <div className="text-sm font-mono">{dateInfo.time}</div>
    </span>
  );
}
