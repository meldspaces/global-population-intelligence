-- Reports, public-interest findings, and citations.
-- Applied on the preview database and safe to re-run on Railway PostGIS.
-- Never delete reports, findings, links, or people. Re-rank and refresh only.
-- Do not store data about a person who uses this app. No accounts, no addresses, no device identifiers.

create table if not exists reports (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  dek text not null,
  tab_label text not null,
  category text not null,
  icon_key text not null,
  priority integer not null,
  evidence integer not null,
  as_of date not null,
  focus_iso text,
  focus_year integer,
  series_codes text[] not null,
  analysis jsonb not null,
  span text not null default 'regular',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_priority_idx on reports (priority desc, evidence desc);

create table if not exists interest_findings (
  id bigserial primary key,
  observed_on date not null,
  topic text not null,
  category text not null,
  summary text not null,
  search_query text not null,
  priority integer not null,
  source_url text,
  report_slug text references reports (slug),
  pipeline_status text not null default 'queued',
  created_at timestamptz not null default now(),
  unique (observed_on, topic)
);
create index if not exists interest_findings_day_idx on interest_findings (observed_on desc, priority desc);

create table if not exists report_links (
  id bigserial primary key,
  report_id bigint not null references reports (id),
  kind text not null,
  title text not null,
  url text not null,
  author text,
  account text,
  published_on date,
  excerpt text,
  relevance integer not null,
  relevance_reason text not null,
  bias_author text not null default 'Unrated',
  bias_account text not null default 'Unrated',
  bias_post text not null default 'Unrated',
  bias_rater text,
  bias_checked_on date,
  unique (report_id, url)
);

create table if not exists report_people (
  id bigserial primary key,
  report_id bigint not null references reports (id),
  name text not null,
  role text not null,
  source_title text not null,
  source_url text not null,
  unique (report_id, name, source_url)
);

comment on table reports is 'Public statistical reports. Never store data about a person who uses this app.';
comment on table interest_findings is 'Daily public-interest notes for the development pipeline. Not user data.';
