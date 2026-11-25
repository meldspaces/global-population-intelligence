import { createServerFn } from "@tanstack/react-start";
export type ReportCard = {
  slug: string;
  title: string;
  dek: string;
  tabLabel: string;
  category: string;
  iconKey: string;
  priority: number;
  evidence: number;
  asOf: string;
  span: string;
  seriesCodes: string[];
};

export type AnalysisBlock =
  | { type: "heading" | "paragraph"; text: string }
  | { type: "stat_year"; series: string; year: number }
  | { type: "stat_top"; series: string; year: number; n: number }
  | { type: "stat_focus"; series: string; year: number; iso: string };

export type ReportLink = {
  kind: string;
  title: string;
  url: string;
  author: string | null;
  account: string | null;
  publishedOn: string | null;
  excerpt: string | null;
  relevance: number;
  relevanceReason: string;
  biasAuthor: string;
  biasAccount: string;
  biasPost: string;
  biasRater: string | null;
  biasCheckedOn: string | null;
};

export type ReportPerson = {
  name: string;
  role: string;
  sourceTitle: string;
  sourceUrl: string;
};

export type ReportDetail = ReportCard & {
  focusIso: string | null;
  focusYear: number | null;
  analysis: AnalysisBlock[];
  links: ReportLink[];
  people: ReportPerson[];
  finding: string | null;
};

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.replace(/[{}]/g, "").split(",").filter(Boolean);
  return [];
}

function card(row: Record<string, unknown>): ReportCard {
  return {
    slug: String(row.slug),
    title: String(row.title),
    dek: String(row.dek),
    tabLabel: String(row.tab_label),
    category: String(row.category),
    iconKey: String(row.icon_key),
    priority: Number(row.priority),
    evidence: Number(row.evidence),
    asOf: String(row.as_of).slice(0, 10),
    span: String(row.span),
    seriesCodes: asArray(row.series_codes),
  };
}

export const listReports = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
    const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select slug, title, dek, tab_label, category, icon_key, priority, evidence, as_of, span, series_codes
    from reports
    order by priority desc, evidence desc
    limit 10
  `;
  return rows.map(card);
});

export const getReport = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error("Unknown report");
    return slug;
  })
  .handler(async ({ data: slug }): Promise<ReportDetail | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select slug, title, dek, tab_label, category, icon_key, priority, evidence, as_of, span,
             series_codes, focus_iso, focus_year, analysis
      from reports
      where slug = ${slug}
    `;
    const row = rows[0];
    if (!row) return null;
    const links = await sql<Record<string, unknown>>`
      select l.kind, l.title, l.url, l.author, l.account, l.published_on, l.excerpt,
             l.relevance, l.relevance_reason, l.bias_author, l.bias_account, l.bias_post,
             l.bias_rater, l.bias_checked_on
      from report_links l
      join reports r on r.id = l.report_id
      where r.slug = ${slug}
      order by l.relevance desc, l.title
    `;
    const people = await sql<Record<string, unknown>>`
      select p.name, p.role, p.source_title, p.source_url
      from report_people p
      join reports r on r.id = p.report_id
      where r.slug = ${slug}
      order by p.name
    `;
    const findings = await sql<{ summary: string }>`
      select summary from interest_findings
      where report_slug = ${slug}
      order by observed_on desc, priority desc
      limit 1
    `;
    const analysis = Array.isArray(row.analysis) ? (row.analysis as AnalysisBlock[]) : [];
    return {
      ...card(row),
      focusIso: row.focus_iso ? String(row.focus_iso) : null,
      focusYear: row.focus_year == null ? null : Number(row.focus_year),
      analysis,
      links: links
        .map((link) => ({
          kind: String(link.kind),
          title: String(link.title),
          url: String(link.url),
          author: link.author ? String(link.author) : null,
          account: link.account ? String(link.account) : null,
          publishedOn: link.published_on ? String(link.published_on).slice(0, 10) : null,
          excerpt: link.excerpt ? String(link.excerpt) : null,
          relevance: Number(link.relevance),
          relevanceReason: String(link.relevance_reason),
          biasAuthor: String(link.bias_author),
          biasAccount: String(link.bias_account),
          biasPost: String(link.bias_post),
          biasRater: link.bias_rater ? String(link.bias_rater) : null,
          biasCheckedOn: link.bias_checked_on ? String(link.bias_checked_on).slice(0, 10) : null,
        }))
        .filter((link) => link.relevance >= 60),
      people: people.map((person) => ({
        name: String(person.name),
        role: String(person.role),
        sourceTitle: String(person.source_title),
        sourceUrl: String(person.source_url),
      })),
      finding: findings[0]?.summary ?? null,
    };
  });
