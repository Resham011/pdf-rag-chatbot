import os
import uuid
import shutil
import gc
from dotenv import load_dotenv
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_cohere import CohereEmbeddings  # FREE API embeddings
from langchain_groq import ChatGroq
from typing import Dict, List

load_dotenv()


class AIService:
    def __init__(self):
        # Dictionary to store sessions with vectorstores and chat history
        self.sessions: Dict[str, dict] = {}
        
        # Base docs folder
        self.base_docs_folder = "docs"
        os.makedirs(self.base_docs_folder, exist_ok=True)
        
        print("✅ Using Groq + Cohere (100% FREE)")

        # FREE Cohere embeddings (1000 calls/month)
        cohere_key = os.getenv("COHERE_API_KEY")
        if not cohere_key:
            raise ValueError(
                "❌ COHERE_API_KEY not found!\n"
                "Get FREE key at: https://dashboard.cohere.com/api-keys"
            )
        
        self.embeddings = CohereEmbeddings(
            cohere_api_key=cohere_key,
            model="embed-english-light-v3.0"  # Free tier model
        )
        print("✅ Cohere embeddings ready (FREE)!")

        # FREE Groq LLM
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError(
                "❌ GROQ_API_KEY not found in .env file!\n"
                "Get your free key at: https://console.groq.com/"
            )
        
        self.llm = ChatGroq(
            groq_api_key=groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.3
        )
        
        print("✅ Groq AI ready!")

    def create_session(self) -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        session_folder = os.path.join(self.base_docs_folder, session_id)
        os.makedirs(session_folder, exist_ok=True)
        
        self.sessions[session_id] = {
            "vectorstore": None,
            "folder": session_folder,
            "files": [],
            "chat_history": []  # Store chat messages for persistence
        }
        
        print(f"🆔 Created session: {session_id}")
        
        # Auto-cleanup old sessions to prevent memory bloat
        self.cleanup_old_sessions(max_sessions=10)
        
        return session_id

    async def process_pdf(self, session_id: str, file: UploadFile) -> bool:
        """Process PDF for a specific session"""
        try:
            if session_id not in self.sessions:
                print(f"⚠️ Session {session_id} not found, creating new session")
                session_folder = os.path.join(self.base_docs_folder, session_id)
                os.makedirs(session_folder, exist_ok=True)
                self.sessions[session_id] = {
                    "vectorstore": None,
                    "folder": session_folder,
                    "files": [],
                    "chat_history": []
                }
            
            session = self.sessions[session_id]
            
            # Save file
            file_path = os.path.join(session["folder"], file.filename)
            print(f"💾 [Session {session_id[:8]}] Saving to: {file_path}")
            
            with open(file_path, "wb") as f:
                f.write(await file.read())

            print(f"📄 [Session {session_id[:8]}] Loading PDF: {file.filename}")
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            
            if not documents:
                print("❌ No content in PDF")
                return False
            
            print(f"📚 [Session {session_id[:8]}] Loaded {len(documents)} pages")

            # Split into chunks
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            chunks = splitter.split_documents(documents)
            print(f"✂️ [Session {session_id[:8]}] Created {len(chunks)} chunks")

            # Create or merge vectorstore
            if session["vectorstore"] is None:
                print(f"🔨 [Session {session_id[:8]}] Creating vectorstore...")
                session["vectorstore"] = FAISS.from_documents(
                    chunks,
                    self.embeddings
                )
            else:
                print(f"🔄 [Session {session_id[:8]}] Merging into existing vectorstore...")
                new_vectorstore = FAISS.from_documents(chunks, self.embeddings)
                session["vectorstore"].merge_from(new_vectorstore)
            
            # Track uploaded files
            session["files"].append(file.filename)
            
            print(f"✅ [Session {session_id[:8]}] PDF processed successfully!")
            
            # Force garbage collection to free memory
            gc.collect()

            return True

        except Exception as e:
            print(f"❌ [Session {session_id[:8]}] Error processing PDF: {e}")
            import traceback
            traceback.print_exc()
            return False

    def delete_file(self, session_id: str, filename: str) -> bool:
        """Delete a specific file from session"""
        try:
            if session_id not in self.sessions:
                return False
            
            session = self.sessions[session_id]
            
            # Remove from file list
            if filename in session["files"]:
                session["files"].remove(filename)
            
            # Delete physical file
            file_path = os.path.join(session["folder"], filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ [Session {session_id[:8]}] Deleted file: {filename}")
            
            # Rebuild vectorstore without this file
            remaining_files = session["files"]
            
            if len(remaining_files) == 0:
                # No files left, clear vectorstore
                session["vectorstore"] = None
                print(f"🧹 [Session {session_id[:8]}] Vectorstore cleared (no files left)")
            else:
                # Rebuild vectorstore with remaining files
                print(f"🔄 [Session {session_id[:8]}] Rebuilding vectorstore with {len(remaining_files)} files...")
                all_chunks = []
                
                for remaining_file in remaining_files:
                    file_path = os.path.join(session["folder"], remaining_file)
                    if os.path.exists(file_path):
                        loader = PyPDFLoader(file_path)
                        documents = loader.load()
                        splitter = RecursiveCharacterTextSplitter(
                            chunk_size=1000,
                            chunk_overlap=200
                        )
                        chunks = splitter.split_documents(documents)
                        all_chunks.extend(chunks)
                
                if all_chunks:
                    session["vectorstore"] = FAISS.from_documents(
                        all_chunks,
                        self.embeddings
                    )
                    print(f"✅ [Session {session_id[:8]}] Vectorstore rebuilt")
            
            gc.collect()
            return True
            
        except Exception as e:
            print(f"❌ [Session {session_id[:8]}] Error deleting file: {e}")
            return False

    def ask_question(self, session_id: str, question: str) -> str:
        """Ask question for a specific session"""
        if session_id not in self.sessions:
            return "Session not found. Please upload a PDF first."
        
        session = self.sessions[session_id]
        
        if session["vectorstore"] is None:
            return "Please upload a PDF first."

        try:
            print(f"💬 [Session {session_id[:8]}] Processing question: {question}")
            
            # Retrieve relevant documents
            retriever = session["vectorstore"].as_retriever(search_kwargs={"k": 6})
            docs = retriever.invoke(question)

            # Combine context
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Get source filenames
            sources = list(set([
                os.path.basename(doc.metadata.get("source", "Unknown"))
                for doc in docs
            ]))

            # Create prompt
            prompt = f"""You are a helpful AI assistant. Answer the question based ONLY on the context provided below. 
If the answer is not in the context, say "I cannot find that information in the documents."

Context from documents ({', '.join(sources)}):
{context}

Question: {question}

Provide a detailed, accurate answer based on the context:"""
            
            print(f"🤖 [Session {session_id[:8]}] Generating answer with Groq...")
            
            # Get answer from Groq
            response = self.llm.invoke(prompt)
            answer = response.content
            
            print(f"✅ [Session {session_id[:8]}] Answer generated!")
            
            return answer
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ [Session {session_id[:8]}] Error: {error_msg}")
            import traceback
            traceback.print_exc()
            
            if "rate_limit" in error_msg.lower():
                return "Too many requests. Please wait a moment and try again."
            
            return f"Error generating answer. Please try again."
    
    def save_message(self, session_id: str, question: str, answer: str):
        """Save a chat message to session history"""
        if session_id in self.sessions:
            self.sessions[session_id]["chat_history"].append({
                "question": question,
                "answer": answer
            })
            print(f"💾 [Session {session_id[:8]}] Message saved to history")
    
    def get_chat_history(self, session_id: str) -> List[dict]:
        """Get chat history for a session"""
        if session_id not in self.sessions:
            return []
        return self.sessions[session_id]["chat_history"]
    
    def reset_session(self, session_id: str):
        """Clear a specific session"""
        if session_id not in self.sessions:
            print(f"⚠️ Session {session_id} not found")
            return
        
        print(f"🧹 [Session {session_id[:8]}] Resetting session...")
        
        session = self.sessions[session_id]
        
        # Clear session folder
        if os.path.exists(session["folder"]):
            shutil.rmtree(session["folder"])
        
        # Remove session from memory
        del self.sessions[session_id]
        
        # Force memory cleanup
        gc.collect()
        
        print(f"✅ [Session {session_id[:8]}] Session reset complete!")
    
    def cleanup_old_sessions(self, max_sessions: int = 5):
        """Auto-delete old sessions to save memory (keeps most recent)"""
        if len(self.sessions) > max_sessions:
            # Get oldest sessions (all except last max_sessions)
            all_session_ids = list(self.sessions.keys())
            old_sessions = all_session_ids[:-max_sessions]
            
            for old_session_id in old_sessions:
                print(f"🧹 Auto-cleaning old session: {old_session_id[:8]}")
                self.reset_session(old_session_id)
            
            print(f"✅ Cleaned up {len(old_sessions)} old sessions, kept {max_sessions} most recent")

    
    def get_session_files(self, session_id: str) -> list:
        """Get list of files for a session"""
        if session_id not in self.sessions:
            return []
        return self.sessions[session_id]["files"]


# Global AI service instance
ai_service = AIService()