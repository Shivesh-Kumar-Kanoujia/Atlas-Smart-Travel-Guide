// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Sparkles, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeImage } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

export default function ImageAnalyzer() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState('Describe this travel destination and give me practical travel tips.');
  const fileRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    setImage(file);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setAnalysis(null);
    setError(null);
  };

  const clearImage = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setImage(null);
    setPreview(null);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const b64 = e.target.result.split(',')[1];
          const res = await analyzeImage(b64, image.type, question);
          setAnalysis(res.data.analysis);
        } catch (err) {
          const msg = err.response?.data?.detail || 'Analysis failed. Check your GROQ_API_KEY.';
          toast.error(msg);
          setError(msg);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(image);
    } catch {
      toast.error('Failed to read image');
      setError('Failed to read the selected image file.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!preview ? (
        <div
          className="border-2 border-dashed border-border rounded-2xl hover:border-primary/40 transition-all cursor-pointer bg-card"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="py-16 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground/70 font-medium">Drop a travel photo here</p>
            <p className="text-muted-foreground text-sm mt-1">or click to browse • JPG, PNG, WEBP • Max 5MB</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-80 object-cover rounded-2xl border border-border"
          />
          <button
            onClick={clearImage}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {image && (
        <div className="mt-4 space-y-3">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="What do you want to know about this place?"
          />
          {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing with Groq AI...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Analyze with AI</>
            )}
          </Button>
        </div>
      )}

      {analysis && (
        <div className="mt-5 bg-card border border-border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Destination Analysis
          </h3>
          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
            {analysis}
          </ReactMarkdown>
        </div>
      )}


    </div>
  );
}
