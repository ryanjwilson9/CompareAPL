import React, { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  delay = 200,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Position the tooltip
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;
      
      switch (position) {
        case 'top':
          top = -tooltipRect.height - 10;
          left = (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.height + 10;
          left = (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = (triggerRect.height - tooltipRect.height) / 2;
          left = -tooltipRect.width - 10;
          break;
        case 'right':
          top = (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.width + 10;
          break;
      }
      
      // Check if tooltip would go off-screen and adjust if needed
      const rightEdge = triggerRect.left + left + tooltipRect.width;
      const leftEdge = triggerRect.left + left;
      const topEdge = triggerRect.top + top;
      const bottomEdge = triggerRect.top + top + tooltipRect.height;
      
      if (rightEdge > window.innerWidth) {
        left -= (rightEdge - window.innerWidth + 10);
      }
      
      if (leftEdge < 0) {
        left -= leftEdge - 10;
      }
      
      if (topEdge < 0) {
        if (position === 'top') {
          // Flip to bottom
          top = triggerRect.height + 10;
        } else {
          top -= topEdge - 10;
        }
      }
      
      if (bottomEdge > window.innerHeight) {
        if (position === 'bottom') {
          // Flip to top
          top = -tooltipRect.height - 10;
        } else {
          top -= (bottomEdge - window.innerHeight + 10);
        }
      }
      
      tooltipRef.current.style.top = `${top}px`;
      tooltipRef.current.style.left = `${left}px`;
    }
  }, [isVisible, position]);

  // Handle mounting/unmounting with delay
  useEffect(() => {
    if (isMounted && !isVisible) {
      // Add delay before unmounting
      const timeout = setTimeout(() => {
        setIsMounted(false);
      }, 200); // Transition duration
      
      return () => clearTimeout(timeout);
    }
  }, [isMounted, isVisible]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsMounted(true);
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsVisible(false);
  };

  // Handle keyboard focus
  const handleFocus = () => {
    setIsMounted(true);
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      ref={triggerRef}
    >
      <div tabIndex={0} className="inline-block">
        {children}
      </div>
      
      {isMounted && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 transition-opacity duration-200 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          role="tooltip"
          aria-live="polite"
        >
          <div 
            className="bg-gray-800 text-white p-2 rounded shadow-lg break-words whitespace-normal" 
            style={{ 
              maxWidth: '80vw',
              overflowWrap: 'break-word'
            }}
          >
            {content}
          </div>
          <div 
            className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </div>
  );
};
