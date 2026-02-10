export const TIME_SLOTS = ['09:00', '12:00', '15:00', '18:00', '21:00'];

/** Removable time slot options for Movie Parameters UI. */
export const REMOVABLE_TIME_SLOTS = [
  { value: '06:00-09:00', label: '6:00 a.m. - 9:00 a.m.' },
  { value: '09:00-12:00', label: '9:00 a.m. - 12:00 p.m.' },
  { value: '12:00-15:00', label: '12:00 p.m. - 3:00 p.m.' },
  { value: '15:00-18:00', label: '3:00 p.m. - 6:00 p.m.' },
  { value: '18:00-21:00', label: '6:00 p.m. - 9:00 p.m.' },
  { value: '21:00-00:00', label: '9:00 p.m. - 12:00 a.m.' },
] as const;

/** Day-of-week options reused across dashboards. */
export const DAY_OPTIONS = [
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' },
  { value: 'Sun', label: 'Sunday' },
] as const;

