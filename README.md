# SAP O2C Graph Intelligence

Interactive Order-to-Cash process exploration for SAP data, combining graph visualization, record inspection, and natural-language querying in a single app.

## Overview

This project models the SAP Order-to-Cash flow as a connected graph:

- Sales Orders
- Deliveries
- Billing Documents
- Journal Entries
- Payments
- Customers
- Products
- Plants

The application lets a user:

- explore the O2C process as an interactive graph
- inspect full source records for any node
- ask plain-English business questions and convert them into SQL-backed answers

## Features

- Interactive graph view built with Cytoscape.js
- Node detail sidebar for record inspection
- Natural-language to SQL chat flow
- SQLite-backed dataset for simple deployment
- FastAPI backend serving both APIs and the built frontend
- Render-ready deployment via `render.yaml`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Cytoscape.js |
| Backend | Python, FastAPI, Uvicorn |
| Data | SQLite |
| Graph Modeling | NetworkX |
| LLM Access | OpenRouter |
| Deployment | Render |

## Repository Structure

```text
sap-o2c-graph/
├── backend/
│   ├── db.py
│   ├── graph.py
│   ├── ingest.py
│   ├── llm.py
│   ├── main.py
│   ├── o2c.db
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .python-version
├── render.yaml
└── README.md
```

## How It Works

### Graph Layer

The backend converts SAP O2C entities and relationships into a graph representation that the frontend renders interactively.

### Record Inspection

Selecting a node fetches the corresponding source record from SQLite and displays the mapped metadata in the sidebar.

### Natural-Language Querying

The chat flow follows a grounded pipeline:

1. Guardrail the question for O2C relevance
2. Generate SQL from the user prompt
3. Execute the SQL against SQLite
4. Return a concise answer with supporting rows

## Environment Variables

The application requires:

```env
OPENROUTER_API_KEY=your_key_here
```

Notes:

- Keep the real key in a local `.env`
- Do not commit `.env`
- On Render, set the same value in the service environment settings

## Local Development

### Prerequisites

- Python 3.11
- Node.js 18+ and npm

### 1. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 2. Create a local environment file

```bash
echo "OPENROUTER_API_KEY=your_key_here" > .env
```

On Windows PowerShell:

```powershell
Set-Content .env "OPENROUTER_API_KEY=your_key_here"
```

### 3. Start the backend

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Start the frontend in a second terminal

```bash
cd frontend
npm install
npm run dev
```

### 5. Open the app

Use:

- Frontend dev server: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Deployment on Render

This repository is set up to deploy as a single Render web service.

### Recommended option: Blueprint

1. Push the repository to GitHub
2. In Render, select `New > Blueprint`
3. Connect the repository
4. Keep the Blueprint path as `render.yaml`
5. Add `OPENROUTER_API_KEY`
6. Deploy

### What Render does

- installs backend dependencies from `backend/requirements.txt`
- installs frontend dependencies
- builds the frontend with Vite
- starts the FastAPI backend with Uvicorn
- serves the built frontend from the backend process

### Manual Render setup

If you do not use the Blueprint flow, create a `Web Service` with:

- Build Command: `pip install -r backend/requirements.txt && cd frontend && npm install && npm run build`
- Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

## API Endpoints

Main backend routes:

- `GET /api/health`
- `GET /api/graph`
- `GET /api/graph/node/{id}`
- `POST /api/chat`

## Design Choices

- SQLite keeps the project easy to run and easy to deploy
- FastAPI keeps the backend small and straightforward
- A graph UI is a natural fit for the O2C process
- Grounded SQL execution makes the chat more auditable than a free-form LLM answer

## Notes

- The backend expects the SQLite database at `backend/o2c.db`
- The frontend production build is served from `frontend/dist`
- The repo pins Python with `.python-version` for Render compatibility

## Future Improvements

- Add automated tests for backend endpoints and query generation
- Improve graph layout and visual hierarchy for dense datasets
- Add authentication if the app is exposed outside a controlled environment
- Introduce stronger SQL validation and query tracing
