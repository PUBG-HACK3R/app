"use client";

import { useState } from "react";

interface SimpleCopyButtonProps {
  text: string;
}

export function SimpleCopyButton({ text }: SimpleCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      // Fallback method that works in all browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        copied 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'bg-orange-600 hover:bg-orange-700 text-white'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  );
}
