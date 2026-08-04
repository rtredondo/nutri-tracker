export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00Z');
}

export function getToday(): string {
  return formatDate(new Date());
}

export function addDays(dateString: string, days: number): string {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function getDayName(dateString: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = parseDate(dateString);
  return days[date.getDay()];
}

export function getWeekBoundaries(dateString: string): { monday: string; sunday: string } {
  const date = parseDate(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    monday: formatDate(monday),
    sunday: formatDate(sunday),
  };
}

export function getWeekDates(dateString: string): string[] {
  const { monday } = getWeekBoundaries(dateString);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(monday, i));
  }
  return dates;
}
