"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, X, FileText, Trash2, Upload } from "lucide-react";

interface ChatMessage {
  question: string;
  answer: string;
}

export default function Home() {
     const [messages, setMessages] = useState<ChatMessage[]>([]);
     const [input, setInput] = useState("");
     const [files, setFiles] = useState<string[]>([]);
     const [loading, setLoading] = useState(false);
     const [uploading, setUploading] = useState(false);
     const [sidebarOpen, setSidebarOpen] = useState(false);
     const [sessionId, setSessionId] = useState<string>("");
     const scrollRef = useRef<HTMLDivElement>(null);

     // Create/restore session on mount
     useEffect(() => {
     const initSession = async () => {
          let storedSessionId = localStorage.getItem("pdf_chat_session_id");
          
          if (!storedSessionId) {
          // Create new session
          try {
               const response = await fetch("/api/session/create", {
               method: "POST",
               });
               const data = await response.json();
               storedSessionId = data.session_id;
               localStorage.setItem("pdf_chat_session_id", storedSessionId);
          } catch (error) {
               console.error("Failed to create session:", error);
               return;
          }
          }
          
          setSessionId(storedSessionId);
          console.log("Session ID:", storedSessionId);
          
          // Restore files and chat history from backend
          await restoreSession(storedSessionId);
     };

     initSession();
     }, []);

     const restoreSession = async (sessionId: string) => {
     try {
          // Restore files
          const filesResponse = await fetch(`/api/files?session_id=${sessionId}`);
          const filesData = await filesResponse.json();
          if (filesData.files && filesData.files.length > 0) {
          setFiles(filesData.files);
          }
          
          // Restore chat history
          const chatResponse = await fetch(`/api/chat-history?session_id=${sessionId}`);
          const chatData = await chatResponse.json();
          if (chatData.messages && chatData.messages.length > 0) {
          setMessages(chatData.messages);
          }
          
          console.log("✅ Session restored:", filesData.files.length, "files,", chatData.messages.length, "messages");
     } catch (error) {
          console.error("Failed to restore session:", error);
     }
     };

     useEffect(() => {
     scrollRef.current?.scrollIntoView({ behavior: "smooth" });
     }, [messages]);

     const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     if (!file.name.endsWith(".pdf")) {
          alert("❌ Please upload a PDF file!");
          return;
     }

     if (!sessionId) {
          alert("❌ Session not initialized. Please refresh the page.");
          return;
     }

     setUploading(true);
     const formData = new FormData();
     formData.append("file", file);

     try {
          const response = await fetch(`/api/upload?session_id=${sessionId}`, {
          method: "POST",
          body: formData,
          });

          const data = await response.json();

          if (response.ok) {
          setFiles((prev) => [...prev, file.name]);
          console.log(`✅ ${file.name} uploaded successfully!`);
          } else {
          alert(`❌ Upload failed: ${data.detail || "Unknown error"}`);
          }
     } catch {
          alert("❌ Backend connection failed! Make sure the server is running.");
     } finally {
          setUploading(false);
          e.target.value = "";
     }
     };

     const handleDeleteFile = async (fileName: string, index: number) => {
     if (!sessionId) return;
     
     try {
          // Delete from backend
          const response = await fetch(`/api/delete-file?session_id=${sessionId}&filename=${encodeURIComponent(fileName)}`, {
          method: "DELETE",
          });
          
          if (response.ok) {
          // Remove from UI
          setFiles((prev) => prev.filter((_, i) => i !== index));
          console.log(`✅ Deleted ${fileName} from backend and UI`);
          } else {
          alert("❌ Failed to delete file");
          }
     } catch (error) {
          console.error("Error deleting file:", error);
          alert("❌ Failed to delete file");
     }
     };

     const handleSendMessage = async () => {
     const trimmedInput = input.trim();
     if (!trimmedInput || loading) return;

     if (files.length === 0) {
          alert("📄 Please upload at least one PDF file first!");
          return;
     }

     if (!sessionId) {
          alert("❌ Session not initialized. Please refresh the page.");
          return;
     }

     const userQuestion = trimmedInput;
     setInput("");
     setLoading(true);

     setMessages((prev) => [
          ...prev,
          { question: userQuestion, answer: "🤔 Thinking..." },
     ]);

     try {
          const response = await fetch(`/api/ask?session_id=${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userQuestion }),
          });

          if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Request failed");
          }

          const data = await response.json();
          const answer = data.answer;

          setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].answer = answer;
          return updated;
          });
          
          // Save message to backend for persistence
          await fetch(`/api/save-message?session_id=${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userQuestion, answer: answer }),
          });
          
     } catch (error) {
          setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].answer =
               `❌ Error: ${
               error instanceof Error ? error.message : "Connection failed"
               }`;
          return updated;
          });
     } finally {
          setLoading(false);
     }
     };

     const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
     if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
     }
     };

     const handleReset = async () => {
     if (!window.confirm("Clear conversation history and uploaded files?")) return;

     if (!sessionId) {
          alert("❌ Session not initialized.");
          return;
     }

     try {
          await fetch(`/api/reset?session_id=${sessionId}`, { method: "POST" });
          setMessages([]);
          setFiles([]);
          console.log("✅ Conversation and files cleared!");
     } catch (error) {
          console.error("Reset error:", error);
          alert("❌ Failed to reset conversation");
     }
     };

     return (
     <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
          
          {/* Sidebar */}
          <aside
          className={`fixed md:relative z-30 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 border-r border-gray-200`}
          >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
               <div className="flex justify-between items-center">
               <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Library
               </h2>
               <p className="text-xs text-indigo-100 mt-1">{files.length} document{files.length !== 1 ? 's' : ''}</p>
               </div>
               <button
               className="md:hidden text-white hover:bg-white/20 rounded-lg p-2 transition"
               onClick={() => setSidebarOpen(false)}
               >
               <X size={20} />
               </button>
               </div>
          </div>

          {/* Sidebar Content */}
          <div className="p-6 space-y-4 flex flex-col h-[calc(100%-88px)]">
               {/* Upload Button */}
               <label className={`
               relative block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
               ${uploading 
               ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
               : 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400'
               }
               `}>
               <div className="flex flex-col items-center gap-2">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${uploading ? 'bg-gray-200' : 'bg-indigo-100'}`}>
                    <Upload className={`w-6 h-6 ${uploading ? 'text-gray-400' : 'text-indigo-600'}`} />
               </div>
               <span className={`text-sm font-semibold ${uploading ? 'text-gray-400' : 'text-indigo-700'}`}>
                    {uploading ? "Uploading..." : "Upload PDF"}
               </span>
               <span className="text-xs text-gray-500">Click to browse</span>
               </div>
               <input
               type="file"
               className="hidden"
               accept=".pdf"
               onChange={handleUpload}
               disabled={uploading || !sessionId}
               />
               </label>

               {/* File List */}
               <div className="flex-1 overflow-y-auto space-y-2">
               {files.length === 0 ? (
               <div className="text-center text-gray-400 text-sm mt-12">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-xs">No files uploaded yet</p>
                    <p className="text-xs mt-1">Upload a PDF to start</p>
               </div>
               ) : (
               files.map((file, i) => (
                    <div
                    key={i}
                    className="group relative bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 rounded-lg px-4 py-3 text-sm transition-all hover:shadow-md"
                    >
                    <div className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-2 flex-1 min-w-0">
                         <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                         <span className="truncate text-gray-700 font-medium">{file}</span>
                         </div>
                         <button
                         onClick={() => handleDeleteFile(file, i)}
                         className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 hover:bg-red-100 rounded-lg transition-all"
                         title="Remove file"
                         >
                         <X className="w-4 h-4 text-red-600" />
                         </button>
                    </div>
                    </div>
               ))
               )}
               </div>

               {/* Clear Chat Button */}
               {messages.length > 0 && (
               <button
               onClick={handleReset}
               className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl py-3 text-sm font-semibold hover:from-red-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
               >
               <Trash2 className="w-4 h-4" />
               Clear Chat
               </button>
               )}
          </div>
          </aside>

          {/* Chat Area */}
          <main className="flex-1 flex flex-col relative">
          
          {/* Header */}
          <header className="p-5 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between shadow-sm sticky top-0 z-10">
               <div className="flex items-center gap-3">
               <button
               className="md:hidden hover:bg-gray-100 rounded-lg p-2 transition"
               onClick={() => setSidebarOpen(true)}
               >
               <Menu size={20} />
               </button>
               <div>
               <h1 className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    AskMyPDF AI
               </h1>
               <p className="text-xs text-gray-500">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
               </div>
               </div>
               
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {messages.length === 0 ? (
               <div className="flex items-center justify-center h-full">
               <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">💬</div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                    Welcome to AskMyPDF!
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                    Upload a PDF document and start asking questions. 
                    Our AI will help you understand your documents better.
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                    🔒 Your files are private.
                    </p>
               </div>
               </div>
               ) : (
               messages.map((msg, index) => (
               <div key={index} className="space-y-4 max-w-4xl mx-auto">
                    {/* User Question */}
                    <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-2xl rounded-tr-md max-w-[80%] shadow-lg">
                         <p className="text-sm font-medium leading-relaxed">{msg.question}</p>
                    </div>
                    </div>

                    {/* AI Answer */}
                    <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4 max-w-[85%] shadow-md">
                         <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                         {msg.answer}
                         </p>
                    </div>
                    </div>
               </div>
               ))
               )}
               <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="p-5 bg-white/80 backdrop-blur-sm border-t border-gray-200">
               <div className="max-w-4xl mx-auto">
               <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-5 py-3 shadow-inner">
               <input
                    type="text"
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-500"
                    placeholder="Ask something..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading || !sessionId}
               />
               <button
                    onClick={handleSendMessage}
                    disabled={loading || !input.trim() || files.length === 0 || !sessionId}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm"
               >
                    {loading ? "•••" : "Send"}
               </button>
               </div>
               <p className="text-xs text-gray-400 text-center mt-2">
               Press Enter to send • {files.length === 0 ? "Upload a PDF to start" : "Ready to answer"}
               </p>
               </div>
          </div>
          </main>
     </div>
     );
}