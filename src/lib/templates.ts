import type { BoardColor, CardPriority } from '@/types/domain';

export type TemplateIcon = 'blank' | 'kanban' | 'sprint' | 'content' | 'bugs' | 'personal';

export interface TemplateCard {
  title: string;
  description?: string;
  priority?: CardPriority;
  label?: string;
}

export interface TemplateList {
  title: string;
  cards: TemplateCard[];
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: TemplateIcon;
  color: BoardColor;
  lists: TemplateList[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank board',
    description: 'Start fresh with an empty canvas',
    icon: 'blank',
    color: 'lavender',
    lists: [],
  },
  {
    id: 'basic-kanban',
    name: 'Basic Kanban',
    description: 'A classic To Do, In Progress, Done workflow',
    icon: 'kanban',
    color: 'sage',
    lists: [
      {
        title: 'To Do',
        cards: [{ title: 'Plan project scope', priority: 'medium', label: 'Planning' }],
      },
      {
        title: 'In Progress',
        cards: [{ title: 'Design wireframes', priority: 'high', label: 'Design' }],
      },
      {
        title: 'Done',
        cards: [{ title: 'Kickoff meeting', priority: 'low' }],
      },
    ],
  },
  {
    id: 'scrum-sprint',
    name: 'Scrum Sprint',
    description: 'An agile sprint board for development teams',
    icon: 'sprint',
    color: 'sky',
    lists: [
      {
        title: 'Backlog',
        cards: [{ title: 'User authentication', priority: 'high', label: 'Feature' }],
      },
      {
        title: 'Sprint',
        cards: [{ title: 'API integration', priority: 'medium', label: 'Feature' }],
      },
      { title: 'In Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and publish your content pipeline',
    icon: 'content',
    color: 'peach',
    lists: [
      {
        title: 'Ideas',
        cards: [{ title: 'Blog: getting started guide', label: 'Blog' }],
      },
      {
        title: 'Drafting',
        cards: [{ title: 'Social media campaign', label: 'Social' }],
      },
      { title: 'Review', cards: [] },
      { title: 'Published', cards: [] },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Track, triage, and resolve software issues',
    icon: 'bugs',
    color: 'rose',
    lists: [
      {
        title: 'Reported',
        cards: [
          { title: 'Login button unresponsive on mobile', priority: 'high', label: 'Bug' },
        ],
      },
      { title: 'In Progress', cards: [] },
      { title: 'QA Testing', cards: [] },
      { title: 'Resolved', cards: [] },
    ],
  },
  {
    id: 'personal-tasks',
    name: 'Personal Tasks',
    description: 'Organise daily life and personal goals',
    icon: 'personal',
    color: 'sand',
    lists: [
      {
        title: 'Inbox',
        cards: [{ title: 'Schedule dentist appointment', priority: 'low' }],
      },
      {
        title: 'This Week',
        cards: [{ title: 'Grocery shopping', priority: 'medium' }],
      },
      {
        title: 'Someday',
        cards: [{ title: 'Learn a new language', priority: 'none' }],
      },
    ],
  },
];

export function getTemplateById(id: string | null | undefined): BoardTemplate | undefined {
  if (!id) return undefined;
  return BOARD_TEMPLATES.find((template) => template.id === id);
}

export function templateCardCount(template: BoardTemplate): number {
  return template.lists.reduce((total, list) => total + list.cards.length, 0);
}
