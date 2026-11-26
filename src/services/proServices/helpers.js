/**
 * Valens Pro-Services Helpers & Formatter Utilities
 * Matches the official API Guide rules for values and error handling
 */

export const getDeviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch (_) {
    return 'America/New_York';
  }
};

/**
 * Days mapping: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export const DAYS_CONFIG = [
  { dayOfWeek: 1, key: 'Mon', label: 'Mon', fullLabel: 'Monday' },
  { dayOfWeek: 2, key: 'Tue', label: 'Tue', fullLabel: 'Tuesday' },
  { dayOfWeek: 3, key: 'Wed', label: 'Wed', fullLabel: 'Wednesday' },
  { dayOfWeek: 4, key: 'Thu', label: 'Thu', fullLabel: 'Thursday' },
  { dayOfWeek: 5, key: 'Fri', label: 'Fri', fullLabel: 'Friday' },
  { dayOfWeek: 6, key: 'Sat', label: 'Sat', fullLabel: 'Saturday' },
  { dayOfWeek: 0, key: 'Sun', label: 'Sun', fullLabel: 'Sunday' },
];

export const DAYS_MAP = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday',
};

export const formatDaysPayload = (selectedDays, dayTimes) => {
  const rules = [];
  if (Array.isArray(selectedDays)) {
    selectedDays.forEach(dayNum => {
      const slots = dayTimes?.[dayNum] || [{ start: '10:00', end: '18:00' }];
      slots.forEach(slot => {
        rules.push({
          dayOfWeek: Number(dayNum),
          start: slot.start || '10:00',
          end: slot.end || '18:00',
        });
      });
    });
  }
  return rules;
};

/**
 * Format currency label based on priceUnit from API:
 * SESSION -> "/ session"
 * MONTH -> "/ month"
 * TICKET_FROM -> "Tickets from"
 * BOOKING -> ""
 */
export const formatPriceWithUnit = (price = 0, priceUnit = '', currency = '$') => {
  // If first param is a string unit like 'SESSION', gracefully handle swapped args
  if (typeof price === 'string' && ['SESSION', 'MONTH', 'TICKET_FROM', 'BOOKING'].includes(price.toUpperCase())) {
    const temp = price;
    price = priceUnit;
    priceUnit = temp;
  }
  const currSym = currency === 'usd' || currency === 'USD' ? '$' : (currency || '$');
  const num = typeof price === 'number' ? price : parseFloat(price);
  const formattedPrice = !isNaN(num) ? `${currSym}${num.toFixed(2)}` : `${currSym}${price || 0}`;

  switch (String(priceUnit || '').toUpperCase()) {
    case 'SESSION':
      return `${formattedPrice} / session`;
    case 'MONTH':
      return `${formattedPrice} / month`;
    case 'TICKET_FROM':
      return `Tickets from ${formattedPrice}`;
    case 'BOOKING':
      return formattedPrice;
    default:
      return formattedPrice;
  }
};

export const formatPriceUnit = (priceUnit, price = 0, currency = '$') => {
  return formatPriceWithUnit(price, priceUnit, currency);
};

/**
 * Map readiness problem field to wizard step
 */
export const mapProblemFieldToStep = (field, serviceType) => {
  const f = String(field || '').toLowerCase();

  if (f.includes('title') || f.includes('description') || f.includes('category')) {
    return 1;
  }
  if (f.includes('ticket')) {
    return 3;
  }
  if (f.includes('cohort')) {
    return 3; // In Mentorship, cohorts are configured in Step 3
  }
  if (f.includes('startdate') || f.includes('customstart') || f.includes('start') || f.includes('date')) {
    return 2;
  }
  if (f.includes('event')) {
    return 2;
  }
  if (f.includes('package')) {
    return 2;
  }
  if (f.includes('program') || f.includes('mentorship') || f.includes('goal')) {
    return 2;
  }
  if (f.includes('availability') || f.includes('rule') || f.includes('slot')) {
    return serviceType === 'CONSULTATION' ? 2 : 3;
  }
  if (f.includes('duration') || f.includes('price') || f.includes('address') || f.includes('contactphone')) {
    return 2;
  }

  return 1;
};

export const mapReadinessToStep = (field, serviceType) => {
  return mapProblemFieldToStep(field, serviceType);
};

/**
 * Normalize time to 24-hour "HH:mm"
 */
export const to24HourString = (hours, minutes = '00', ampm = null) => {
  let h = parseInt(hours, 10);
  const m = String(minutes).padStart(2, '0');

  if (ampm) {
    const isPm = ampm.toUpperCase() === 'PM';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
  }

  return `${String(h).padStart(2, '0')}:${m}`;
};

/**
 * Parse 24h "18:00" string to readable "6:00 PM"
 */
export const format24HourTo12 = timeStr => {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;

  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';

  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  return `${h}:${m} ${ampm}`;
};
