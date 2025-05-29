# Healthcare APL Comparison Tool

A web application for comparing healthcare All Plan Letters (APLs) and generating detailed markdown reports of the differences between them.

## Features

- Upload and compare two APL PDF files
- Analyze differences using OpenAI's o3 model
- Generate comprehensive markdown reports highlighting key changes
- Multi-step analysis process for improved accuracy
- Clean, modern UI with real-time progress updates

## Project Structure

The application consists of two main parts:

### Frontend (React + TypeScript + Vite)

- Modern UI built with React, TypeScript, and Vite
- Styling with Tailwind CSS and Shadcn UI components
- File upload interface for APL PDFs
- Real-time progress updates during processing
- Markdown rendering of comparison results

### Backend (FastAPI)

- REST API built with FastAPI
- PDF text extraction with PyPDF
- OpenAI API integration for document comparison
- Background task processing
- Polling mechanism for status updates

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Activate the virtual environment:
   ```
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Set your OpenAI API key:
   ```
   export OPENAI_API_KEY=your_api_key_here  # On Windows: set OPENAI_API_KEY=your_api_key_here
   ```

4. Start the FastAPI server:
   ```
   python main.py
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

   The application will be available at http://localhost:5173

## Usage

1. Open the application in your browser
2. Upload an old APL PDF file in the "Old APL" section
3. Upload a new APL PDF file in the "New APL" section
4. Click "Compare APLs" to start the analysis
5. Wait for the processing to complete (this may take a few minutes)
6. View the generated markdown report highlighting the differences
7. Optionally download the markdown report for future reference

## Analysis Process

The application uses a multi-step process to generate accurate comparisons:

1. User uploads two PDF files: APL{old}.pdf and APL{new}.pdf
2. The system extracts text from both PDFs
3. The validated example (APL13-014.PDF, APL25-008.PDF, and Diff__13-014_25-008.md) is used as context
4. The o3 model generates an initial difference markdown
5. The old APL and initial difference are used to generate an estimate of the new APL
6. The actual new APL, estimated new APL, and initial difference are compared to identify missed changes
7. A final comprehensive difference markdown is generated and displayed to the user

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Python, PyPDF
- **AI**: OpenAI o3 model
- **Other**: Axios, React-Markdown
