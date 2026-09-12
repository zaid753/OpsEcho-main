# OpsEcho - Project Architecture & Documentation

## 1. Product Overview
OpsEcho is a real-time Incident Management and Site Reliability Engineering (SRE) collaboration platform. It provides a centralized "Incident Room" where engineering teams can communicate via voice and typed chat during critical outages. As the team communicates, an AI Incident Commander listens in real-time, automatically extracts facts, hypotheses, decisions, and action items, and generates live situation reports.

## 2. Workflow Architecture
The core workflow of the application revolves around real-time data ingestion, AI processing, and state synchronization:

1. **Ingestion**: Users communicate in an Incident Room. Voice audio is processed locally, transcribed via the Web Speech API (or similar browser APIs), and typed messages are captured via chat inputs.
2. **Transmission**: Transcripts and chat messages are sent to the Node.js backend via REST POST requests (`/api/incidents/:id/chat`).
3. **AI Processing**: The backend triggers an asynchronous AI processor. The processor retrieves the current state of the incident (existing facts, hypotheses, context) and feeds it, along with the new transcript, to the LLM (Gemini).
4. **Data Extraction & Demotion**: The AI analyzes the input, extracting structured data (new facts, actions, conflicts). Crucially, it applies a "Demotion Rule" to detect if new information contradicts existing facts, demoting outdated facts to hypotheses.
5. **Persistence**: The structured outputs are saved to a relational database (SQLite/PostgreSQL via Prisma).
6. **Real-Time Sync**: The backend broadcasts the updated incident state and new transcripts back to all connected clients via Socket.IO, ensuring every participant sees the live intel board update instantly.

## 3. Frontend Architecture
**Tech Stack**: React 19, Vite, TailwindCSS, Framer Motion, Socket.IO Client, Agora RTC SDK.

- **Component-Driven UI**: The app is built with functional React components. The primary view is `IncidentRoom.tsx`, which orchestrates the complex layout of the communication timeline, the Live Intel sidebar, and the Report tab.
- **State Management**: React `useState` and `useCallback` manage local UI state. The application relies on optimistic UI updates (e.g., rendering voice text immediately upon speaking) to mask network latency.
- **Real-Time Subscriptions**: A `SocketContext` manages a global Socket.IO connection. `IncidentRoom` subscribes to events like `TRANSCRIPT_NEW` and `incident:updated` to trigger re-renders when the backend pushes new data. A 3-second background polling mechanism acts as a fallback to ensure data consistency if the WebSocket drops.
- **Styling**: TailwindCSS is used for utility-first styling, paired with Framer Motion for smooth micro-animations (e.g., pop-in effects for new chat bubbles, pulsing audio visualizers).

## 4. Backend Structure
**Tech Stack**: Node.js, Express, Prisma ORM, Socket.IO, Google GenAI SDK, LangChain/LangGraph.

- **API Layer (`server/src/routes/`)**: Express routers handle RESTful endpoints for authentication (`auth.ts`), incident management (`incidents.ts`), and Agora token generation (`agora.ts`).
- **Service Layer (`server/src/services/`)**:
  - `aiProcessor.ts`: Orchestrates the flow of receiving a transcript, invoking the AI, parsing the results, and updating the database.
  - `gemini.ts`: Contains the direct integration with the `@google/genai` SDK and the highly-tuned prompt engineering required to act as the AI Incident Commander.
- **Database (`server/prisma/`)**: Prisma manages the schema, defining models for `User`, `Incident`, `Transcript`, `Fact`, `Hypothesis`, `Action`, etc., ensuring type-safe database queries.
- **Real-Time Engine (`server/src/lib/socket.ts`)**: Initializes the Socket.IO server, handles JWT authentication for socket connections, and manages room-based broadcasting (`socket.join('incident:id')`).

## 5. Technology Roles

### Agora (Real-Time Communication)
Agora provides the underlying WebRTC infrastructure for the voice communication layer. 
- It handles capturing the user's microphone (`AgoraRTC.createMicrophoneAudioTrack()`), joining voice channels, and streaming audio with ultra-low latency to other participants in the room. 
- It also utilizes the **Agora AI Denoiser Extension** to suppress background noise in real-time, ensuring that the voice data fed into the application is crisp and clear.

### Gemini API (AI Intelligence)
The Gemini API (specifically `gemini-3.6-flash` and `gemini-2.5-flash`) acts as the "brain" of the AI Incident Commander.
- **Structured Extraction**: It is heavily prompt-engineered to consume messy human conversation and output strict JSON containing facts, hypotheses, decisions, and action items.
- **Summary Generation**: It is used to generate the cleanly formatted Markdown Post-Mortem Reports (and Live Reports) based on the accumulated data of the incident.

### LangChain & LangGraph (Workflow Orchestration)
While the core AI loop currently leverages direct Gemini API calls for speed and simplicity, the project includes **LangChain** and **LangGraph** (`server/src/lib/graph/incidentGraph.ts`) for advanced, stateful workflow orchestration.
- **LangChain**: Provides the standardized abstractions (like `ChatGoogleGenerativeAI` and `BaseMessage`) to interact with Large Language Models. It makes it easier to swap out models, manage prompts, and parse outputs.
- **LangGraph**: Enables the creation of cyclical, stateful, multi-agent workflows. In this architecture, LangGraph is designed to break down the complex AI task into discrete "Nodes" (e.g., Node 1: Analyze Transcript -> Node 2: Persist to Database). This state-machine approach allows the application to handle more complex AI routines, such as having multiple AI agents debate a hypothesis before saving it, or introducing human-in-the-loop approval steps.
