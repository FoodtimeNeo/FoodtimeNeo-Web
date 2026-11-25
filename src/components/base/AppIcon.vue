<script setup>
defineProps({ name: { type: String, default: 'note' } });
const paths = {
  folder: 'M3 7V5h6l2 2h10v13H3ZM3 10h18',
  chevronDown: 'm6 9 6 6 6-6',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7',
  canteen: 'M4 11h16M5 11a7 7 0 0 0 14 0M9 7V4m3 3V3m3 4V4M7 21h10',
  community:
    'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Zm0 15A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5ZM9 8h6m-6 4h4',
  admin: 'M4 7h16M4 12h16M4 17h10m4-2 2 2-2 2',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  store:
    'M4 9V6l2-3h12l2 3v3M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0M5 11v10h14V11M9 21v-6h6v6',
  bell: 'M6 9a6 6 0 1 1 12 0c0 4 1.5 6 2 7H4c.5-1 2-3 2-7Zm4 11a2 2 0 0 0 4 0',
  palette:
    'M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H13a2 2 0 0 1-2-2 2 2 0 0 1 2-2h3a5 5 0 0 0 5-5c0-2.2-4-4-9-4Zm-4 7h.01M9.5 7h.01M14.5 7h.01',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15',
  key: 'M15 7a4 4 0 1 1-7.7 1.5L3 13v4h4v-2h2v-2h1.5A4 4 0 0 1 15 7Zm0 1h.01',
  filter: 'M3 4h18l-7 8v7l-4 2V12Z',
  dish: 'M4 12h16M5 12a7 7 0 0 0 14 0M8 8V5m4 3V3m4 5V5M8 21h8',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z',
  clock: 'M4 6v5h5M4.5 10a8 8 0 1 1 0 5M12 7v5l3 2',
  note: 'M6 3h12v18H6ZM9 8h6m-6 4h6m-6 4h4',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14ZM4 20H2',
  comment: 'M4 4h16v12H9l-5 4ZM8 8h8m-8 4h5',
  reply: 'm9 5-6 6 6 6M3 11h11a6 6 0 0 1 6 6v2',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  inbox: 'M4 5h16v15H4ZM4 13h5l1 3h4l1-3h5M8 9h8',
  feedback: 'M4 4h16v12h-9l-7 4ZM12 7v4m0 2v.1',
  correct: 'm5 12 4 4L19 6M4 4h6M4 20h16',
  shield: 'm12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6Zm0 4v6m0 3v.1',
  lock: 'M6 10h12v11H6ZM8 10V7a4 4 0 0 1 8 0v3m-4 5v3',
  block: 'M5 5 19 19M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  settings:
    'm9 3-1 3-3 1-2 3 2 3v4l3 1 1 3h6l1-3 3-1v-4l2-3-2-3-3-1-1-3Zm3 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  mail: 'M3 5h18v14H3Zm0 0 9 8 9-8',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
};
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.note" />
  </svg>
</template>
