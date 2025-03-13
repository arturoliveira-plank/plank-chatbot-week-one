import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceControlsProps {
  onVoiceInput: (text: string) => void;
  messageToSpeak?: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export function VoiceControls({ onVoiceInput, messageToSpeak }: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        toast.info('Listening... Speak now', {
          duration: 2000,
          className: 'font-mono bg-navy-800 text-white border-navy-600',
        });
      };

      recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
        const text = event.results[0][0].transcript;
        onVoiceInput(text);
        setIsListening(false);
        toast.success('Voice input received', {
          duration: 2000,
          className: 'font-mono bg-navy-800 text-white border-navy-600',
        });
      };

      recognition.onerror = (event: { error: string }) => {
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was aborted.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your audio settings.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your connection.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'service-not-available':
            errorMessage = 'Speech recognition service is not available.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        setError(errorMessage);
        setIsListening(false);
        toast.error(errorMessage, {
          duration: 3000,
          className: 'font-mono bg-navy-800 text-white border-navy-600',
        });
      };

      recognition.onend = () => {
        if (!error) {
          setIsListening(false);
        }
      };

      setRecognition(recognition);
    }
  }, [onVoiceInput]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Speech recognition is not supported in your browser', {
        duration: 3000,
        className: 'font-mono bg-navy-800 text-white border-navy-600',
      });
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const speakMessage = () => {
    if (!messageToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(messageToSpeak);
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleListening}
        disabled={!recognition || isSpeaking}
        className={`${isListening ? 'bg-navy-700 text-white' : ''} relative`}
      >
        <Mic className="h-4 w-4" />
        {isListening && (
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
      {messageToSpeak && (
        <Button
          variant="outline"
          size="icon"
          onClick={isSpeaking ? stopSpeaking : speakMessage}
          disabled={isListening}
          className={`${isSpeaking ? 'bg-navy-700 text-white' : ''}`}
        >
          {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
} 