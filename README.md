# MysteryX

A full-stack mystery investigation app built with React, Express, MongoDB, and Google Gemini. Cases are generated and validated on the server; culprit and solution data are excluded from public responses until an accusation is submitted.

## Requirements

- Node.js 20+
- MongoDB (local or hosted)
- Google Gemini API key

## Setup

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `GEMINI_API_KEY`, and a long `SESSION_SECRET`.
2. Copy `client/.env.example` to `client/.env` if the API is not running at `http://localhost:5000/api/v1`.
3. Run `npm install` at the project root.
4. Run `npm run dev`.

The client runs at http://localhost:5173 and the API at http://localhost:5000. `npm run build` creates the production client bundle; run the API with `npm start`.

## Security and behavior

- The server issues a signed, anonymous session cookie. The browser does not choose an authorization identity.
- MongoDB stores generated cases and investigation progress. Gemini credentials and private solutions remain server-side.
- Without valid MongoDB and Gemini configuration, case generation returns a safe setup/service error. No hardcoded cases are passed off as generated content. Temporary Gemini overloads use bounded exponential backoff, then try the configured fallback model (`gemini-3.5-flash-lite` by default).
- Generated cases are schema checked for suspect/evidence references, timeline references, a fixed culprit, and solution explanation before persistence.

## API

All endpoints are under `/api/v1`. See `server/src/routes/api.js` for the implemented health, generation, case, evidence, investigation, accusation, and history routes.
