export type TDateFormat =
  | 'yyyy-MM-dd'
  | 'hh:mm aaa'
  | 'iii'
  | 'dd'
  | 'MMM'
  | 'EEE	MMM d, yyyy'
  | 'MMM d, yyyy'
  | 'EEE';

export function dateFormat(date: Date, format: TDateFormat) {
  switch (format) {
    case 'yyyy-MM-dd':
      return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
        -2,
      )}-${('0' + date.getDate()).slice(-2)}`;

    case 'MMM':
      return date.toLocaleString('en-US', { month: 'short' });

    case 'dd':
      return date.toLocaleString('en-US', { day: '2-digit' });

    case 'iii':
      return date.toLocaleString('en-US', { weekday: 'short' });

    case 'EEE':
      return date.toLocaleString(undefined, { weekday: 'long' });

    case 'hh:mm aaa':
      return date.toLocaleString('en-US', {
        timeStyle: 'short',
        hourCycle: 'h12',
      });

    case 'EEE	MMM d, yyyy':
      return date.toLocaleString(undefined, { dateStyle: 'full' });

    case 'MMM d, yyyy':
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
  }
}
