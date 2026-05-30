import sys
import warnings

# Suppress warnings from Whisper
warnings.filterwarnings("ignore")

try:
    import whisper  # type: ignore
except ImportError:
    print("ERROR: Whisper is not installed. Please run 'pip install -U openai-whisper'", file=sys.stderr)
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("ERROR: No audio file provided.", file=sys.stderr)
        sys.exit(1)
        
    audio_path = sys.argv[1]
    
    try:
        # Load the base model (good balance of speed and accuracy, small footprint)
        model = whisper.load_model("base")
        
        # Transcribe the audio
        result = model.transcribe(audio_path, fp16=False)
        
        # Print only the extracted text to stdout for Node.js to capture
        print(result["text"].strip())
    except FileNotFoundError:
        print(f"ERROR: Audio file not found at {audio_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Transcription failed. details: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
