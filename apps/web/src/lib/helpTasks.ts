export type HelpTask = {
  question: string;
  answer: string;
};

/** Common dealership questions. Catalog articles stay available below. */
export const HELP_TASKS: HelpTask[] = [
  {
    question: 'How do I add vehicles?',
    answer: 'Open Vehicles and use Add vehicle, import a spreadsheet, or paste VINs. A vehicle can be listed once it has a price and photos.',
  },
  {
    question: 'Why is a vehicle not showing on a site?',
    answer: 'Usually a missing price or photos, or the destination is not connected yet. Vehicles shows what is missing. Channels shows whether that destination can receive updates.',
  },
  {
    question: 'How do I connect a destination like CarGurus?',
    answer: 'Open Channels and choose the destination. Sign in or add the details they ask for. Connected means we can send listings — it does not mean they are live yet.',
  },
  {
    question: 'Where do buyer inquiries go?',
    answer: 'They land in Leads. Statuses are shared with your team. Email alerts go to the primary contact unless you add another method in Settings.',
  },
  {
    question: 'How do I invite someone on my team?',
    answer: 'Settings → Team. Share the invite link with them. StarterGrid does not email the link automatically.',
  },
  {
    question: 'What does Autopilot do?',
    answer: 'When it is on, ready vehicles can be sent to the destinations you selected. Pausing stops new sends. It does not prove a listing is live.',
  },
];
