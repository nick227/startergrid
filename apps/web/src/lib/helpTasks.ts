export type HelpTask = {
  question: string;
  answer: string;
  docId: string;
};

/** Short answers lead to the same articles used by contextual help. */
export const HELP_TASKS: HelpTask[] = [
  {
    question: 'How do I add vehicles?',
    answer: 'Open Vehicles and choose Add vehicle or Import spreadsheet. Review any missing details before choosing where to list the vehicle.',
    docId: 'inventory/csv-import',
  },
  {
    question: 'Why is my vehicle not showing on a website?',
    answer: 'Check the vehicle’s missing details, then its destination on Channels. Saved, connected and sent do not mean a listing has been confirmed live.',
    docId: 'app/sync-vs-accounts',
  },
  {
    question: 'How do I connect a marketplace or advertising site?',
    answer: 'Open Channels and choose the site. Follow its setup steps. Some sites need a partner’s approval or manual work before they can receive listings.',
    docId: 'app/channels',
  },
  {
    question: 'Where do buyer inquiries go?',
    answer: 'Inquiries received by StarterGrid appear in Leads. Your team shares their status and notes. Email and other alerts have separate delivery settings.',
    docId: 'app/lead-status',
  },
  {
    question: 'How do I invite someone or fix a sign-in problem?',
    answer: 'Owners manage their team in Settings. Internal staff use People & access in the dealership record. Check whether the invitation was emailed or needs to be shared as a link.',
    docId: 'app/team-access',
  },
  {
    question: 'What does Autopilot do, and what happens if I pause it?',
    answer: 'Autopilot updates supported destinations you select. Pausing stops new publication work; removal of listings it manages can continue. Check the destination’s result before assuming a change is live.',
    docId: 'processes/auto-sync',
  },
];
