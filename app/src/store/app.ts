import { useStorage } from '@vueuse/core';

export interface ILocalUserId {
  id: string;
  name: string;
}

export const localUserId = useStorage<ILocalUserId | null>(
  'hanasu_user_id',
  null,
  localStorage,
  {
    serializer: {
      read: (v) => JSON.parse(v),
      write: (v) => JSON.stringify(v),
    },
  },
);
