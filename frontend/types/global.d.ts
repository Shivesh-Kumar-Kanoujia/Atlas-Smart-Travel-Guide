interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare module 'leaflet.markercluster' {
  import * as L from 'leaflet';
  export function markerClusterGroup(options?: any): L.LayerGroup;
}

declare module 'leaflet-fullscreen' {
  import * as L from 'leaflet';
  export interface FullscreenOptions {
    position?: string;
    title?: string;
    titleCancel?: string;
    forceSeparateButton?: boolean;
    forcePseudoFullscreen?: boolean;
  }
  export class Fullscreen extends L.Control {
    constructor(options?: FullscreenOptions);
  }
  export function fullscreen(options?: FullscreenOptions): Fullscreen;
}

declare module 'leaflet-gesture-handling' {
  import * as L from 'leaflet';
  export interface GestureHandlingOptions {
    // options
  }
  export class GestureHandling extends L.Handler {
    constructor(map: L.Map, options?: GestureHandlingOptions);
  }
  export function gestureHandling(options?: GestureHandlingOptions): GestureHandling;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}