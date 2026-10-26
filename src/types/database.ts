/** Snake_case rows returned by PostgREST. Keep this file in sync with migrations. */

export interface ProfileRow {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface BoardRow {
  id: string;
  title: string;
  description: string;
  color: string;
  template_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BoardOverviewRow extends BoardRow {
  list_count: number;
  card_count: number;
  overdue_count: number;
  due_today_count: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  none_priority_count: number;
  member_count: number;
}

type EmbeddedProfile = Pick<ProfileRow, 'id' | 'display_name'>;

export interface BoardMemberRow {
  board_id: string;
  user_id: string;
  role: string;
  created_at: string;
  /** PostgREST returns an object for many-to-one embeds; tolerate arrays too. */
  profiles: EmbeddedProfile | EmbeddedProfile[] | null;
}

export interface ListRow {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  board_id: string;
  list_id: string;
  title: string;
  description: string;
  position: number;
  assignee_id: string | null;
  priority: string;
  due_date: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogRow {
  id: string;
  board_id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface UpcomingCardRow {
  id: string;
  board_id: string;
  title: string;
  due_date: string;
  priority: string;
}

export interface MemberIdRow {
  user_id: string;
}
