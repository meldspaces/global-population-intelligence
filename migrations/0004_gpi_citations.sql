-- Citations, named public figures, and the first interest log.
-- Inserts only. Existing rows are kept. Refresh uses the conflict keys.

insert into report_links (
  report_id, kind, title, url, author, account, published_on, excerpt,
  relevance, relevance_reason, bias_author, bias_account, bias_post, bias_rater, bias_checked_on
)
select r.id, v.kind, v.title, v.url, v.author, null, v.published_on, v.excerpt,
       v.relevance, v.reason, 'Unrated', 'Unrated', 'Unrated', v.rater, '2026-11-25'::date
from reports r
join (
  values
    ('cop31-and-temperature', 'article',
     'COP31: New draft deal aims to avert collapse of talks at climate summit',
     'https://www.bbc.co.uk/news/articles/cq7827z2841zo',
     'Esme Stallard and Jessica Lamb', '2026-11-22'::date,
     'BBC report from Antalya on the overtime draft and the summit president.',
     92, 'Directly about the COP31 deadlock this page discusses.',
     null),
    ('cop31-and-temperature', 'article',
     'COP31 to take place 9–20 November 2026 in Antalya, Türkiye',
     'https://www.un.org/en/climatechange/cop31',
     'United Nations', '2026-11-22'::date,
     'UN record that the Antalya conference closed without consensus.',
     95, 'Primary institutional account of the summit outcome.',
     null),
    ('cop31-and-temperature', 'article',
     'U.N. COP31 climate conference ends with no agreement after fossil fuel debate reaches standstill',
     'https://www.cbsnews.com/news/un-cop31-climate-conference-ends-no-agreement-fossil-fuel-debate-standstill/',
     'CBS News', '2026-11-22'::date,
     'Account of the fossil-fuel dispute and the lack of a final agreement.',
     90, 'Corroborates the outcome and names officials on the record.',
     null),
    ('cop31-and-temperature', 'data',
     'Temperature anomaly from the 1991–2020 average',
     'https://ourworldindata.org/grapher/annual-temperature-anomalies',
     'Our World in Data', null::date,
     'Country-year temperature series used for every figure on this page.',
     98, 'This is the data source, not a news story.',
     null),
    ('sudan-battle-deaths', 'data',
     'Sudan: events and estimated deaths',
     'https://conflictstats.com/country/sudan/',
     'ConflictStats, from UCDP', null::date,
     'A monitor page that keeps 2026 marked as preliminary and separate from complete years.',
     84, 'Relevant, and it warns that 2026 is incomplete. It is not the series drawn on the chart.',
     null),
    ('global-conflict-2025', 'data',
     'Deaths in armed conflicts',
     'https://ourworldindata.org/grapher/deaths-in-armed-conflicts-by-country',
     'Our World in Data, from UCDP', null::date,
     'Country-year battle deaths used for the ranking.',
     98, 'This is the data source for the chart.',
     null),
    ('ukraine-battle-deaths', 'data',
     'Deaths in armed conflicts',
     'https://ourworldindata.org/grapher/deaths-in-armed-conflicts-by-country',
     'Our World in Data, from UCDP', null::date,
     'Country-year battle deaths, including Ukraine.',
     98, 'This is the data source for the chart.',
     null),
    ('palestine-battle-deaths', 'data',
     'Deaths in armed conflicts',
     'https://ourworldindata.org/grapher/deaths-in-armed-conflicts-by-country',
     'Our World in Data, from UCDP', null::date,
     'Country-year battle deaths, including Palestine.',
     98, 'This is the data source for the chart.',
     null),
    ('yemen-battle-deaths', 'data',
     'Deaths in armed conflicts',
     'https://ourworldindata.org/grapher/deaths-in-armed-conflicts-by-country',
     'Our World in Data, from UCDP', null::date,
     'Country-year battle deaths. 2026 is a partial year.',
     98, 'This is the data source for the chart.',
     null),
    ('homicide-rate', 'data',
     'Homicide rate',
     'https://ourworldindata.org/grapher/homicide-rate-unodc',
     'Our World in Data, from UNODC', null::date,
     'Intentional homicide rate per 100,000 people.',
     98, 'This is the data source for the chart.',
     null),
    ('calorie-supply', 'data',
     'Daily calorie supply per person',
     'https://ourworldindata.org/grapher/daily-per-capita-caloric-supply',
     'Our World in Data, from FAO', null::date,
     'Average caloric supply. Not a hunger census.',
     98, 'This is the data source for the chart.',
     null),
    ('income-per-person', 'data',
     'GDP per capita',
     'https://ourworldindata.org/grapher/gdp-per-capita-worldbank',
     'Our World in Data, from the World Bank', null::date,
     'GDP per capita in international dollars.',
     98, 'This is the data source for the chart.',
     null),
    ('alcohol-consumption', 'data',
     'Total alcohol consumption per capita',
     'https://ourworldindata.org/grapher/total-alcohol-consumption-per-capita-litres-of-pure-alcohol',
     'Our World in Data, from WHO', null::date,
     'Recorded liters of pure alcohol per person aged 15 and older, through 2020.',
     98, 'This is the data source for the chart.',
     null)
) as v(slug, kind, title, url, author, published_on, excerpt, relevance, reason, rater)
  on r.slug = v.slug
on conflict (report_id, url) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  relevance = excluded.relevance,
  relevance_reason = excluded.relevance_reason,
  bias_checked_on = excluded.bias_checked_on;

insert into report_people (report_id, name, role, source_title, source_url)
select r.id, v.name, v.role, v.source_title, v.source_url
from reports r
join (
  values
    ('cop31-and-temperature', 'Murat Kurum', 'COP31 president and Turkey''s environment minister',
     'COP31: New draft deal aims to avert collapse of talks at climate summit',
     'https://www.bbc.co.uk/news/articles/cq7827z2841zo'),
    ('cop31-and-temperature', 'António Guterres', 'United Nations Secretary-General',
     'COP31 to take place 9–20 November 2026 in Antalya, Türkiye',
     'https://www.un.org/en/climatechange/cop31'),
    ('cop31-and-temperature', 'Darragh O''Brien', 'Ireland''s climate minister, speaking for the EU',
     'U.N. COP31 climate conference ends with no agreement',
     'https://www.cbsnews.com/news/un-cop31-climate-conference-ends-no-agreement-fossil-fuel-debate-standstill/')
) as v(slug, name, role, source_title, source_url)
  on r.slug = v.slug
on conflict (report_id, name, source_url) do update set
  role = excluded.role,
  source_title = excluded.source_title;

insert into interest_findings (observed_on, topic, category, summary, search_query, priority, source_url, report_slug, pipeline_status)
values
  ('2026-11-25', 'COP31 closed without a pact', 'climate',
   'Coverage on 25 November still centers on the Antalya talks ending without consensus. The matching statistic is the temperature-anomaly series, not a claim about the next year''s weather.',
   'COP31 Antalya climate talks November 2026', 100,
   'https://www.un.org/en/climatechange/cop31', 'cop31-and-temperature', 'shipped'),
  ('2026-11-25', 'Battle deaths concentrated in a few wars', 'conflict',
   'Public attention is on Ukraine, Sudan, Palestine, and Yemen. The latest complete conflict year in the warehouse is 2025. 2026 remains preliminary.',
   'Sudan Ukraine conflict deaths 2025 2026', 98,
   'https://ourworldindata.org/grapher/deaths-in-armed-conflicts-by-country', 'global-conflict-2025', 'shipped')
on conflict (observed_on, topic) do update set
  summary = excluded.summary,
  priority = excluded.priority,
  source_url = excluded.source_url,
  report_slug = excluded.report_slug,
  pipeline_status = excluded.pipeline_status;
