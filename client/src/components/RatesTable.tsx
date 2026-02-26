import { useState } from 'react';

interface Rate {
  id: string;
  rateId?: string;
  name?: string;
  carrierName: string;
  serviceName: string;
  transitDays?: number;
  totalCost: number;
  currency: string;
  iconUrl?: string;
  booked?: boolean;
  eta?: string;
}

interface RatesTableProps {
  rates: Rate[];
  onBook: (rateId: string) => void;
  loading: boolean;
  bookingExhausted?: boolean;
}

type SortField = 'carrierName' | 'serviceName' | 'transitDays' | 'totalCost';
type SortDirection = 'asc' | 'desc';

export default function RatesTable({ rates, onBook, loading, bookingExhausted = false }: RatesTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRateSelection = (rate: Rate) => {
    if (bookingExhausted || isBooking || loading || rate.booked) return;
    if (selectedRateId === rate.id) {
      setSelectedRateId(null);
      return;
    }
    setSelectedRateId(rate.id);
  };

  const handleRequestToBook = async () => {
    if (bookingExhausted || !selectedRateId || isBooking || loading) return;
    setIsBooking(true);
    try {
      await onBook(selectedRateId);
      setSelectedRateId(null);
    } finally {
      setIsBooking(false);
    }
  };

  const sortedRates = [...rates].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (sortField === 'totalCost') {
      aVal = a.totalCost;
      bVal = b.totalCost;
    } else if (sortField === 'transitDays') {
      aVal = a.transitDays ?? Infinity;
      bVal = b.transitDays ?? Infinity;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const oneBooked = rates.some(r => r.booked);

  return (
    <div className="mt-4 space-y-4">
      {bookingExhausted || oneBooked ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">
            ✓ You&apos;ve placed your one booking for this quote. To request another rate, close this window and run a new &quot;Get Rates&quot; search (each search uses one rate token and allows one request to book).
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            You may request to book <strong>one rate</strong> per token.
          </p>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900">Available Rates</h2>

      {/* Mobile: card layout with single selection */}
      <div className="block md:hidden space-y-4">
        {sortedRates.map((rate) => {
          const isSelected = selectedRateId === rate.id;
          const isDisabled = bookingExhausted || rate.booked || (selectedRateId !== null && !isSelected);
          return (
            <div
              key={rate.id}
              onClick={() => !isDisabled && !rate.booked && handleRateSelection(rate)}
              className={`
                bg-white rounded-lg shadow-md p-4 border-2 cursor-pointer transition-all
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                ${rate.booked ? 'bg-green-50 border-green-200 cursor-default' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                      ${rate.booked ? 'border-green-500 bg-green-500' : ''}
                    `}
                  >
                    {(isSelected || rate.booked) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate" title={rate.name || rate.carrierName}>
                    {rate.name || rate.carrierName}
                  </h3>
                  <p className="text-sm text-gray-600 truncate" title={rate.serviceName}>{rate.serviceName}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{rate.transitDays != null ? `${rate.transitDays} days` : '—'}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(rate.totalCost, rate.currency)}</span>
                  </div>
                </div>
              </div>
              {isSelected && !rate.booked && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">✓ Selected — Click &quot;Request to Book&quot; below to proceed</p>
                </div>
              )}
              {rate.booked && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">✓ Request Submitted</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: table with single selection */}
      <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {!bookingExhausted && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10" aria-label="Select"></th>}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('carrierName')}>
                <div className="flex items-center space-x-1"><span>Carrier</span><SortIcon field="carrierName" /></div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('serviceName')}>
                <div className="flex items-center space-x-1"><span>Service</span><SortIcon field="serviceName" /></div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('transitDays')}>
                <div className="flex items-center space-x-1"><span>Transit Days</span><SortIcon field="transitDays" /></div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalCost')}>
                <div className="flex items-center space-x-1"><span>Total</span><SortIcon field="totalCost" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRates.map((rate) => {
              const isSelected = selectedRateId === rate.id;
              const isDisabled = bookingExhausted || rate.booked || (selectedRateId !== null && !isSelected);
              return (
                <tr
                  key={rate.id}
                  onClick={() => !isDisabled && handleRateSelection(rate)}
                  className={`
                    ${rate.booked ? 'bg-green-50' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                  `}
                >
                  {!bookingExhausted && (
                  <td className="px-6 py-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected || rate.booked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {(isSelected || rate.booked) && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </td>
                  )}
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-3 min-w-0">
                      {rate.iconUrl ? (
                        <img src={rate.iconUrl} alt={rate.name || rate.carrierName} className="h-8 w-8 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">{(rate.name || rate.carrierName).substring(0, 2).toUpperCase()}</div>
                      )}
                      <span className="truncate max-w-[180px]" title={rate.name || rate.carrierName}>{rate.name || rate.carrierName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate" title={rate.serviceName}>{rate.serviceName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.transitDays != null ? `${rate.transitDays}` : '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(rate.totalCost, rate.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Single Request to Book button (hidden once one booking placed for this quote) */}
      {!bookingExhausted && (
      <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 pt-4 pb-4 -mx-4 px-4">
        <button
          type="button"
          onClick={handleRequestToBook}
          disabled={!selectedRateId || isBooking || loading}
          className={`
            w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors
            ${selectedRateId && !isBooking && !loading
              ? 'bg-s2-red hover:bg-s2-red-dark text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isBooking || loading ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Processing...
            </>
          ) : selectedRateId ? (
            'Request to Book Selected Rate'
          ) : (
            'Select a rate above, then click here to request booking'
          )}
        </button>
        {selectedRateId && (
          <p className="text-center text-sm text-gray-500 mt-2">Click the selected rate again to deselect</p>
        )}
      </div>
      )}
    </div>
  );
}
