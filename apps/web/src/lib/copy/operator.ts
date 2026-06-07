/** Shell copy — vertical-neutral channel operations console */

export const operatorCopy = {
  platforms: {
    title: 'Platforms',
    searchPlaceholder: 'Search channels',
  },
  queue: {
    title: 'Queue',
    searchPlaceholder: 'Search asset, stock #, channel',
    empty: 'Nothing waiting — all channels are up to date.',
    emptyFilter: 'No tasks match your filters.',
  },
  history: {
    title: 'History',
    searchPlaceholder: 'Search activity',
    empty: 'No activity recorded yet.',
    readOnlyNote: 'Read-only log. To fix issues, open Queue.',
  },
  taskActions: {
    post: 'Post',
    update: 'Update',
    remove: 'Remove',
    sold: 'Sold',
  },
  connection: {
    inactive: 'Inactive',
    connected: 'Connected',
    blocked: 'Blocked',
    updating: 'Updating',
  },
} as const;
