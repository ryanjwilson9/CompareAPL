import React from 'react';
import { Tooltip } from './ui/tooltip';

interface CitationPreviewProps {
  citation: {
    page: number;
    line: number;
    text?: string; // New field
  } | null;
  documentName: string;
}

export const CitationPreview: React.FC<CitationPreviewProps> = ({ 
  citation, 
  documentName 
}) => {
  if (!citation) return null;
  
  const displayText = `${documentName.replace('.pdf', '')}: Page ${citation.page}, Line ${citation.line}`;
  
  // If there's no citation text, just render the plain text
  if (!citation.text) {
    return <div className="text-sm text-gray-500">{displayText}</div>;
  }
  
  return (
    <Tooltip
      content={
        <div style={{ width: '400px', maxWidth: '80vw' }}>
          <div className="text-xs text-gray-400 mb-1">{displayText}</div>
          <div 
            className="text-sm overflow-auto" 
            style={{ 
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              maxHeight: '600px',
              overflowY: 'auto'
            }}
          >
            {citation.text}
          </div>
        </div>
      }
      position="top"
      className="tooltip-container"
    >
      <span className="text-sm text-gray-500 cursor-help underline decoration-dotted">
        {displayText}
      </span>
    </Tooltip>
  );
};
