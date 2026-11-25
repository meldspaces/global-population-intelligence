# Global Population Intelligence

Country-year evidence on homicide, diet, alcohol, conflict, income, and temperature, with a report for each topic that is in the public conversation.

Hosted on Railway. The database is the Railway Postgres + PostGIS service (`DATABASE_URL`). Reports and daily findings live in that database and are not deleted. The atlas reads the shipped country-year snapshot; figures on a report are computed from it.

## Railway

`railway.json` builds with Nixpacks and starts `npm start`, which applies `migrations/*.sql` and then serves the Node app on `PORT`. Health check: `/api/health`.

No information about a person who uses the app is stored.
