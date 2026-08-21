import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

/**
 * Enterprise CustomSelect / Dropdown Component
 * Replaces native <select> with a sleek, styled dropdown.
 * Supports variant='light' (default) and variant='dark' for dark backgrounds.
 */
const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  icon: Icon,
  disabled = false,
  size = 'sm',
  align = 'left',
  variant = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.label,
        label: opt.label !== undefined ? opt.label : String(opt.value || ''),
        badge: opt.badge,
        icon: opt.icon,
        description: opt.description
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (onChange) {
      onChange({ target: { value: optValue } });
    }
    setIsOpen(false);
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2 text-xs gap-2',
    lg: 'px-3.5 py-2.5 text-sm gap-2'
  };

  const isDark = variant === 'dark';

  const triggerBase = isDark
    ? `bg-slate-700/80 border-slate-600 hover:border-slate-500 text-slate-100 focus:ring-slate-500/30 focus:border-slate-400 ${isOpen ? 'ring-2 ring-slate-500/30 border-slate-400' : ''}`
    : `bg-white border-slate-200 hover:border-slate-300 text-slate-700 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 shadow-xs' : ''}`;

  const menuBase = isDark
    ? 'bg-slate-800 border-slate-700 shadow-2xl'
    : 'bg-white border-slate-100 shadow-xl';

  const itemSelected = isDark
    ? 'bg-slate-700 text-blue-300 font-semibold'
    : 'bg-blue-50 text-blue-700 font-semibold';

  const itemDefault = isDark
    ? 'text-slate-300 hover:bg-slate-700 hover:text-white font-medium'
    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium';

  const checkColor = isDark ? 'text-blue-400' : 'text-blue-600';
  const chevronColor = 'text-slate-400';
  const iconColor = isDark ? 'text-slate-400' : 'text-slate-400';

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between font-semibold rounded-lg border focus:outline-none focus:ring-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size] || sizeClasses.sm} ${triggerBase} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
          {selectedOption?.icon && <selectedOption.icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="ml-1 px-1.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <FiChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-1 transition-transform duration-200 ${chevronColor} ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 mt-1 min-w-[160px] w-full max-w-xs rounded-xl border p-1 max-h-60 overflow-y-auto ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${menuBase} ${menuClassName}`}
          >
            {normalizedOptions.length === 0 ? (
              <div className={`px-3 py-2 text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No options available
              </div>
            ) : (
              normalizedOptions.map((option) => {
                const isSelected = String(option.value) === String(value);

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? itemSelected : itemDefault
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {option.icon && <option.icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <span className={`px-1.5 rounded text-[10px] font-bold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && <FiCheck className={`w-3.5 h-3.5 shrink-0 ml-1.5 ${checkColor}`} />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
