import type { CardPriority } from './schemas';

export interface TemplateCard {
  title: string;
  description?: string;
  priority?: CardPriority;
  label?: string;
}

export interface TemplateList {
  title: string;
  cards?: TemplateCard[];
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  lists: TemplateList[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Board',
    description: 'Start fresh with an empty canvas',
    icon: '✨',
    color: 'lavender',
    lists: [],
  },
  {
    id: 'basic-kanban',
    name: 'Basic Kanban',
    description: 'Classic To Do → In Progress → Done workflow',
    icon: '📋',
    color: 'sage',
    lists: [
      { title: 'To Do', cards: [{ title: 'Plan project scope', priority: 'medium', label: 'Planning' }] },
      { title: 'In Progress', cards: [{ title: 'Design wireframes', priority: 'high', label: 'Design' }] },
      { title: 'Done', cards: [{ title: 'Kickoff meeting', priority: 'low' }] },
    ],
  },
  {
    id: 'scrum-sprint',
    name: 'Scrum Sprint',
    description: 'Agile sprint board for dev teams',
    icon: '🚀',
    color: 'sky',
    lists: [
      { title: 'Backlog', cards: [{ title: 'User authentication', priority: 'high', label: 'Feature' }] },
      { title: 'Sprint', cards: [{ title: 'API integration', priority: 'medium', label: 'Feature' }] },
      { title: 'In Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and publish content pipeline',
    icon: '📝',
    color: 'peach',
    lists: [
      { title: 'Ideas', cards: [{ title: 'Blog: Getting started guide', label: 'Blog' }] },
      { title: 'Drafting', cards: [{ title: 'Social media campaign', label: 'Social' }] },
      { title: 'Review', cards: [] },
      { title: 'Published', cards: [] },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Track and resolve software issues',
    icon: '🐛',
    color: 'rose',
    lists: [
      { title: 'Reported', cards: [{ title: 'Login button unresponsive on mobile', priority: 'high', label: 'Bug' }] },
      { title: 'In Progress', cards: [] },
      { title: 'QA Testing', cards: [] },
      { title: 'Resolved', cards: [] },
    ],
  },
  {
    id: 'personal-tasks',
    name: 'Personal Tasks',
    description: 'Organize your daily life and goals',
    icon: '🎯',
    color: 'lavender',
    lists: [
      { title: 'Inbox', cards: [{ title: 'Schedule dentist appointment', priority: 'low' }] },
      { title: 'This Week', cards: [{ title: 'Grocery shopping', priority: 'medium' }] },
      { title: 'Someday', cards: [{ title: 'Learn a new language', priority: 'none' }] },
    ],
  },
];

export function getTemplateById(id: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((t) => t.id === id);
}

export const BOARD_COLORS = ['lavender', 'sage', 'peach', 'sky', 'rose', 'sand'] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

export const CARD_LABELS = ['Bug', 'Feature', 'Design', 'Planning', 'Blog', 'Social', 'Urgent'] as const;