Prompt

You are a Senior Frontend Engineer tasked with building the production UI for Fixora — an AI GitHub Issue Resolver.

Fixora is a multi-agent AI pipeline that automatically analyzes GitHub issues and generates pull requests.

Your job is to build a complete React frontend that visualizes each agent step.

Use the reference screenshot below as the main UI inspiration for layout, colors, card design, and typography.

Reference Screenshot:

The UI should look like a modern SaaS AI platform similar to the screenshot (dark theme, purple accents, card-based layout).

Tech Stack

Build using:

React + Vite

TailwindCSS

React Router

Framer Motion (minimal animations)

Axios for API calls

The UI must look production-ready and polished.

Theme Colors

Use the following color system:

Purpose	Color	Hex
Main Background	Deep Black	#0B0B0F
Secondary Background	Dark Purple	#1A0F2E
Card Background	Slight Purple	#1E1435

Design style inspired by the screenshot:

dark SaaS UI

purple accent gradients

soft glowing buttons

rounded cards

subtle borders

minimal animations

glass-like panels

Application Flow

The application visualizes the Fixora AI pipeline:

Repository URL
      ↓
Indexer Agent
      ↓
Issue Processor Agent
      ↓
Bug Localization Agent
      ↓
Patch Generator Agent
      ↓
Evaluator Agent

Each step must have its own page.

Layout Requirements

Each page must contain:

Sidebar showing pipeline progress

Main content area

Agent status header

Results card

Action button to move to next step

Sidebar example:

Indexer
Issue Processor
Localizer
Patch Generator
Evaluator

Highlight the active step.

Pages
1 Indexer Page

Route:

/indexer

User pastes GitHub repository URL.

UI components:

GitHub URL input

Start indexing button

Progress indicator

Logs panel

API:

POST /api/index
{
  repo_url
}

After success → navigate to Issue Processor.

2 Issue Processor Page

Route:

/issue

Displays issue classification results.

Show card containing:

Issue Title
Type
Component
Severity
Summary
Steps to Reproduce
Keywords

API:

GET /api/issue

Button:

Run Localization
3 Localizer Page

Route:

/localizer

Displays retrieved code snippets.

Two sections:

Relevant Snippets

Each snippet card shows:

file_path
start_line
end_line
snippet
score
Probable Bug Files

List of files detected.

API:

GET /api/localize

Button:

Generate Patch
4 Patch Generator Page

Route:

/patcher

Display generated patch.

Use diff style UI:

- removed code
+ added code

Also show:

files changed
lines added
lines removed

API:

GET /api/patch

Button:

Apply Patch
5 Evaluator Page

Route:

/evaluator

Display evaluation results.

Show cards:

Fix Confidence Score
Test Pass Rate
Code Quality Score

Pull request info:

PR Link
Branch Name
Commit Message

API:

GET /api/evaluate

Display success indicator:

Pull Request Created Successfully
Animations

Use Framer Motion for:

page transitions

card hover effects

progress step animation

Animations must be minimal and smooth.

API Integration

Create reusable API client.

Example:

src/api/client.js

Use Axios.

Example call:

axios.post("/api/index", { repo_url })

Handle loading states and errors.

Folder Structure

Generate full project:

src
 ├ components
 │  ├ Sidebar.jsx
 │  ├ AgentCard.jsx
 │  ├ CodeSnippet.jsx
 │
 ├ pages
 │  ├ Indexer.jsx
 │  ├ IssueProcessor.jsx
 │  ├ Localizer.jsx
 │  ├ Patcher.jsx
 │  ├ Evaluator.jsx
 │
 ├ api
 │  └ client.js
 │
 ├ App.jsx
 ├ main.jsx