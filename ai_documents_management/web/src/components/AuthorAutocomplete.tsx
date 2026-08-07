import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface Author {
  author_id: number;
  full_name: string;
  hoc_ham: string | null;
}

interface AuthorAutocompleteProps {
  value: string;
  onChange: (fullName: string, hocHam?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AuthorAutocomplete({
  value,
  onChange,
  placeholder = 'Tên tác giả',
  className = 'form-input w-full',
  disabled = false,
}: AuthorAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Author[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSelecting = useRef(false);

  // Sync internal query with external value if it changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAuthors = async () => {
      if (isSelecting.current) {
        isSelecting.current = false;
        return;
      }
      
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get<Author[]>(`/authors?q=${encodeURIComponent(query)}`);
        setSuggestions(response.data);
        setIsOpen(true);
      } catch (error) {
        console.error('Error fetching authors:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchAuthors, 300); // Debounce 300ms
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal); // Let parent know about manual typing
    if (!newVal) {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (author: Author) => {
    isSelecting.current = true;
    setQuery(author.full_name);
    onChange(author.full_name, author.hoc_ham || '');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        autoComplete="off"
        className={className}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0 && !disabled) setIsOpen(true);
        }}
        disabled={disabled}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((author) => (
            <li
              key={author.author_id}
              className="px-4 py-2 mx-1 my-1 rounded-md cursor-pointer text-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-blue-50 hover:shadow-sm hover:text-blue-700 relative z-20"
              onClick={() => handleSelect(author)}
            >
              <div className="font-medium text-gray-900">
                {author.hoc_ham ? `${author.hoc_ham} ` : ''}{author.full_name}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
