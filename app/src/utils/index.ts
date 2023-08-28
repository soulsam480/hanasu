export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  if (i === 0) return `${bytes} ${sizes[i]})`;

  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}
