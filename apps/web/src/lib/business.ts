export function apiDate(value: string) {
  return new Date(value.includes('T') && !/(Z|[+-]\d{2}:\d{2})$/i.test(value) ? `${value}Z` : value);
}

export function businessDate(value: string | Date = new Date()) {
  const date = typeof value === 'string' ? apiDate(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Dhaka', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');
}

export function businessTime(value: string) {
  return apiDate(value).toLocaleString('en-GB', {timeZone:'Asia/Dhaka',hour12:false});
}

export const money = (minor: number) => `৳${(minor / 100).toLocaleString('en-BD', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
