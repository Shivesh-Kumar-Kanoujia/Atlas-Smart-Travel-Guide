import { useState, useRef } from "react";
import { Upload, Loader2, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { analyzeImage } from "../lib/api";
import toast from "react-hot-toast";

export default function ImageAnalyzer() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("Describe this travel destination and give me practical travel tips.");
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setAnalysis(null);
  };

  const clearImage = () => { setImage(null); setPreview(null); setAnalysis(null); };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const b64 = e.target.result.split(",")[1];
          const res = await analyzeImage(b64, image.type, question);
          setAnalysis(res.data.analysis);
        } catch (err) {
          toast.error(err.response?.data?.detail || "Analysis failed. Check your GROQ_API_KEY.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(image);
    } catch {
      toast.error("Failed to read image");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-sand-900 mb-1">Travel Image AI</h2>
        <p className="text-sand-500 text-sm">Upload a travel photo — AI will identify the destination and give you travel tips</p>
      </div>

      {!preview ? (
        <div
          className="border-2 border-dashed border-sand-300 rounded-2xl hover:border-sand-400 transition-all cursor-pointer bg-white"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <div className="py-20 text-center">
            <Upload className="w-12 h-12 text-sand-300 mx-auto mb-4" />
            <p className="text-sand-600 font-medium">Drop a travel photo here</p>
            <p className="text-sand-400 text-sm mt-1">or click to browse • JPG, PNG, WEBP • Max 5MB</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full max-h-80 object-cover rounded-2xl border border-sand-200" />
          <button onClick={clearImage}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {image && (
        <div className="mt-4 space-y-3">
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2}
            className="w-full px-4 py-3 bg-white border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400 resize-none text-sand-700"
            placeholder="What do you want to know about this place?" />
          <button onClick={handleAnalyze} disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-sand-500 to-ocean-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with Groq AI...</>
                     : <><Sparkles className="w-4 h-4" /> Analyze with AI</>}
          </button>
        </div>
      )}

      {analysis && (
        <div className="mt-5 bg-white border border-sand-200 rounded-2xl p-6 animate-slide-up shadow-sm">
          <h3 className="font-display text-lg font-semibold text-sand-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sand-500" /> AI Destination Analysis
          </h3>
          <ReactMarkdown className="prose prose-sm max-w-none text-sand-700">{analysis}</ReactMarkdown>
        </div>
      )}

      {!image && (
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {["🗼 Identify landmarks","🏖️ Get travel tips","📸 Photography advice"].map(t => (
            <div key={t} className="p-4 bg-white border border-sand-200 rounded-xl text-sm text-sand-500 font-medium">{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}
