# Shamba AI

Shamba AI is a production-minded agricultural assistant starter built with Node.js, Express, PostgreSQL, and a responsive vanilla HTML/CSS/JavaScript frontend.

## Run locally

1. Install Node.js 22+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long `JWT_SECRET`.
3. Install dependencies: `npm install`
4. Create the schema: `npm run migrate`
5. Add the general-purpose demo guides: `npm run seed`
6. Start the server: `npm start`
7. Open `http://localhost:3000`.

The health check is `GET /api/health`. Tests run with `npm test`.

## External services

The AI adapter in `src/services/gradient-ai.js` uses DigitalOcean Inference Serverless API's OpenAI-compatible chat-completions endpoint (`https://inference.do-ai.run/v1/chat/completions`). Set `DO_INFERENCE_KEY` and a currently supported `DO_INFERENCE_MODEL` from the DigitalOcean model catalog. The exact model is deliberately environment-configured because availability changes.

Set `WEATHER_API_KEY` for the OpenWeather-backed `/api/weather` endpoint. Without either provider configured, the application returns a visible configuration error; it never creates fake AI or weather data.

Disease uploads accept JPEG, PNG, and WebP files up to 5 MB and are stored outside the public directory. The current workflow records the upload and explicitly reports that no diagnosis is made unless a configured vision-capable model is wired in.

## Deployment

DigitalOcean App Platform can deploy this repository using the Dockerfile or the Node buildpack. Configure `DATABASE_URL` from the managed PostgreSQL database and set `JWT_SECRET`, `DO_INFERENCE_KEY`, `DO_INFERENCE_MODEL`, `WEATHER_API_KEY`, `APP_ORIGIN`, and `COOKIE_SECURE=true` in the App Platform environment. Run `npm run migrate` and `npm run seed` once against the production database before opening the app. The process binds to `PORT` and `0.0.0.0`.

## Scope and safety

Advice is educational guidance, not a guarantee of yield, disease diagnosis, market price, weather, or profit. Confirm high-stakes crop-protection, fertilizer, animal-health, and regulatory decisions with local extension services, qualified agronomists, laboratories, and product labels.
