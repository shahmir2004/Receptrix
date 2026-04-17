import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TranscriptModalProps {
  transcript: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TranscriptModal({ transcript, open, onOpenChange }: TranscriptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#111] border border-white/10">
        <DialogHeader>
          <DialogTitle>Call Transcript</DialogTitle>
          <DialogDescription>Full transcript of the recorded call.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-black/50 p-4 text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap">
          {transcript || 'No transcript available.'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
