# 📄 AskMyPDF AI — PDF RAG Chatbot

> A smart digital assistant that lets you **"talk" to your PDF documents** and get instant answers — without reading through every page.

🔗 **Live Demo:** [pdf-rag-chatbot-five.vercel.app](https://pdf-rag-chatbot-five.vercel.app)

---

## ✨ Features

- 📤 **Upload any PDF** — Support for single or multiple PDF documents
- 💬 **Conversational Q&A** — Ask questions in natural language and get context-aware answers
- 🔍 **RAG-Powered Retrieval** — Uses Retrieval-Augmented Generation to find the most relevant chunks before answering
- ⚡ **Fast Vector Search** — FAISS-powered semantic search for low-latency results
- 🧠 **LLM Integration** — Leverages large language models via LangChain for intelligent responses
- 🌐 **Modern UI** — Clean, responsive Next.js frontend

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js (TypeScript)                |
| Backend    | FastAPI (Python)                    |
| LLM        | Groq (fast LLM inference)           |
| Embeddings | Cohere Embeddings                   |
| AI Framework | LangChain                         |
| Vector DB  | FAISS (Facebook AI Similarity Search)|
| Deployment | Vercel (frontend) Render (Backend)   |

---

## 📁 Project Structure

```
pdf-chatbot/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   └── ai_service.py       # RAG pipeline logic (embedding, retrieval, LLM)
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── models.py               # Pydantic request/response models
│   │   └── routes.py               # API route definitions
│   ├── venv/                       # Python virtual environment
│   ├── .env                        # Environment variables (API keys)
│   ├── .gitignore
│   ├── requirements.txt            # Python dependencies
│   └── runtime.txt                 # Python runtime version
│
└── frontend/
    ├── src/
    │   └── app/
    │       ├── globals.css
    │       ├── layout.tsx
    │       └── page.tsx            # Main UI page
    └── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.9
- A [Groq API key](https://console.groq.com) for LLM inference
- A [Cohere API key](https://dashboard.cohere.com) for embeddings

---

### 1. Clone the repository

```bash
git clone https://github.com/Resham011/pdf-rag-chatbot.git
cd pdf-rag-chatbot
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
COHERE_API_KEY=your_cohere_api_key_here
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🧠 How It Works

1. **Upload** — User uploads a PDF via the frontend.
2. **Parse & Chunk** — The backend extracts text and splits it into overlapping chunks.
3. **Embed** — Each chunk is converted into a vector embedding using **Cohere Embeddings**.
4. **Index** — Embeddings are stored in a FAISS vector index.
5. **Query** — User asks a question; it is embedded (via Cohere) and the top-k most relevant chunks are retrieved.
6. **Generate** — The retrieved context + question are sent to a **Groq-powered LLM** (via LangChain) to produce an accurate, grounded answer.

```
PDF Upload → Text Extraction → Chunking → Embedding → FAISS Index
                                                              ↓
User Question → Embedding → Similarity Search → Top-K Chunks → LLM → Answer
```

---

## 📡 API Endpoints

| Method | Endpoint       | Description                         |
|--------|----------------|-------------------------------------|
| POST   | `/upload`      | Upload and process a PDF file       |
| POST   | `/ask`         | Ask a question about the uploaded PDF |
| GET    | `/health`      | Health check                        |

---

## 🌍 Deployment

- **Frontend** is deployed on [Vercel](https://vercel.com).
- **Backend** is deployed on Render.

Make sure to set the appropriate environment variables in your deployment platform.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

This project is open source. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Resham011**  
GitHub: [@Resham011](https://github.com/Resham011)
