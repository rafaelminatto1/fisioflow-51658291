import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, MapPin } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: any) => void;
  className?: string;
  placeholder?: string;
  label?: string;
  id?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, className, placeholder = "Digite o endereço...", label, id = "address-input" }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(value, 500);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 5) {
      setSuggestions([]);
      return;
    }

    const fetchPlaces = async () => {
      setLoading(true);
      try {
        const searchPlaces = httpsCallable(functions, 'searchPlaces');
        const result = await searchPlaces({ query: debouncedSearch });
        setSuggestions((result.data as any[]) || []);
        setIsOpen(true);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [debouncedSearch]);

  const handleSelect = (place: any) => {
    onChange(place.description);
    if (onSelect) onSelect(place);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder={placeholder}
          aria-label={label || placeholder}
          aria-autocomplete="list"
          aria-controls="address-suggestions-list"
          aria-expanded={isOpen && suggestions.length > 0}
          role="combobox"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id="address-suggestions-list"
          className="absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-auto"
          role="listbox"
        >
          {suggestions.map((place, index) => (
            <li
              key={place.place_id}
              className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-2 text-sm"
              onClick={() => handleSelect(place)}
              role="option"
              aria-selected={false}
              tabIndex={-1}
            >
              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{place.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
