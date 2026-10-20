import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Volume2,
  Calendar,
  Users,
  Tag,
  ArrowRight,
} from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatPaise, getLocalDateString } from '@/lib/utils';
import { api } from '@/lib/api';
import { ParsedAiExpense, HouseholdMember, Category } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface VoiceAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: HouseholdMember[];
  categories: Category[];
}

export function VoiceAssistantModal({
  open,
  onOpenChange,
  members,
  categories,
}: VoiceAssistantModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedExpense, setParsedExpense] = useState<ParsedAiExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English / Hinglish friendly

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => (prev + ' ' + finalTranscript).trim());
      }
      setInterimText(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (event.error !== 'no-speech') {
        setError(`Microphone notice: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setInterimText('');
      setSuccessMsg(null);
      setError(null);
    } else {
      // Prompt user or auto-start listening when modal opens
      if (browserSupported && !parsedExpense) {
        startListening();
      }
    }
  }, [open]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      setError(null);
      recognitionRef.current.start();
    } catch (e: any) {
      // If already started, ignore
      console.warn('Start listening exception:', e);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Process speech transcript using backend Gemini AI
  const handleParseSpeech = async () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) {
      setError('Please say or type something first.');
      return;
    }

    stopListening();
    setIsProcessing(true);
    setError(null);
    setParsedExpense(null);

    try {
      const res = await api<{ success: boolean; expense: ParsedAiExpense }>(
        'POST',
        '/ai/parse-expense',
        { speechText: fullText }
      );

      if (res.success && res.expense) {
        setParsedExpense(res.expense);
      } else {
        throw new Error('AI could not parse the expense. Please try again with more details.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse speech with Gemini AI.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the parsed expense into the database
  const handleSaveExpense = async () => {
    if (!parsedExpense || !user) return;
    setIsSaving(true);
    setError(null);

    try {
      if (parsedExpense.expense_type === 'personal') {
        await api('POST', '/expenses/personal', {
          description: parsedExpense.description,
          amount_paise: parsedExpense.amount_paise,
          category_id: parsedExpense.category || 'General',
          expense_date: parsedExpense.expense_date || getLocalDateString(),
          notes: parsedExpense.notes || `Added via Voice AI: "${transcript}"`,
        });
      } else if (parsedExpense.expense_type === 'on_behalf') {
        // Items must contain valid beneficiary IDs
        const items = (parsedExpense.items || []).map((it) => {
          let benId = it.beneficiary_id;
          // Fallback search member by name if needed
          if (!benId && it.beneficiary_name) {
            const found = members.find(
              (m) =>
                m.full_name.toLowerCase().includes(it.beneficiary_name!.toLowerCase()) ||
                m.username.toLowerCase().includes(it.beneficiary_name!.toLowerCase())
            );
            if (found) benId = found.id;
          }
          return {
            description: it.description,
            amount_paise: it.amount_paise,
            beneficiary_id: benId || user.id,
            category: it.category || 'General',
          };
        });

        if (items.length === 0) {
          throw new Error('No items or beneficiaries identified for on-behalf purchase.');
        }

        await api('POST', '/purchases', {
          description: parsedExpense.description,
          expense_date: parsedExpense.expense_date || getLocalDateString(),
          notes: parsedExpense.notes || `Added via Voice AI: "${transcript}"`,
          items,
        });
      } else if (parsedExpense.expense_type === 'common') {
        // Common expense
        const shares = (parsedExpense.shares || []).map((s) => ({
          user_id: s.user_id,
          amount_paise: s.amount_paise,
        }));

        if (shares.length === 0) {
          throw new Error('No participant shares calculated for common expense.');
        }

        await api('POST', '/expenses/common', {
          description: parsedExpense.description,
          amount_paise: parsedExpense.amount_paise,
          category_id: parsedExpense.category || 'General',
          expense_date: parsedExpense.expense_date || getLocalDateString(),
          paid_by: parsedExpense.paid_by_id || user.id,
          split_method: parsedExpense.split_method || 'equal',
          notes: parsedExpense.notes || `Added via Voice AI: "${transcript}"`,
          shares,
        });
      }

      setSuccessMsg('Expense recorded successfully! 🎉');
      // Invalidate relevant React Queries so all screens update in 0ms
      queryClient.invalidateQueries();

      // Reset and close after brief delight delay
      setTimeout(() => {
        setParsedExpense(null);
        setTranscript('');
        setSuccessMsg(null);
        onOpenChange(false);
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setParsedExpense(null);
    setTranscript('');
    setInterimText('');
    setError(null);
    setSuccessMsg(null);
    startListening();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-card border-border text-foreground">
        {/* Calm Header */}
        <div className="p-6 pb-4 bg-surface-subtle/50 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-brand-soft border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Voice Expense Assistant
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
                    AI Assisted
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Speak naturally to dictate an expense, then review the details before saving
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Success State */}
          {successMsg && (
            <div className="rounded-lg border border-positive/30 bg-positive-soft p-5 text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-positive" />
              <div className="text-base font-semibold text-positive">{successMsg}</div>
              <div className="text-xs text-muted-foreground">Expense saved and ledger updated.</div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-negative/30 bg-negative-soft p-4 text-sm text-negative flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">{error}</div>
            </div>
          )}

          {!parsedExpense && !successMsg && (
            <>
              {/* Clean Mic Button (no idle pulse) */}
              <div className="flex flex-col items-center justify-center py-4">
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isProcessing}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-negative text-white ring-4 ring-negative/20'
                      : 'bg-brand-soft hover:bg-brand-soft/80 text-primary border border-primary/30'
                  }`}
                >
                  {isListening ? (
                    <Mic className="h-7 w-7" />
                  ) : (
                    <MicOff className="h-6 w-6" />
                  )}
                </button>

                <div className="mt-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {isListening
                      ? 'Recording audio... Tap to stop'
                      : 'Tap microphone to speak, or type below'}
                  </span>
                </div>
              </div>

              {/* Real-time Transcript & Manual Edit Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                    Speech Transcript / Input Text
                  </span>
                  {transcript && (
                    <button
                      type="button"
                      onClick={() => {
                        setTranscript('');
                        setInterimText('');
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative rounded-lg border border-border bg-surface-subtle p-3.5 focus-within:border-primary/60 transition-[border-color] duration-100 ease-out">
                  <textarea
                    rows={3}
                    value={transcript + (interimText ? ' ' + interimText : '')}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Try saying: 'Bought groceries for 450 rupees, split equally' or 'Ordered lunch 300 for Saurav'..."
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
                  />
                  {interimText && (
                    <span className="text-xs italic text-primary/80">
                      (listening...)
                    </span>
                  )}
                </div>
              </div>

              {/* Sample Voice Prompts */}
              <div className="rounded-lg border border-border bg-surface-subtle/50 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Quick examples to try:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bought milk and bread 120 rupees personal',
                    'Paid 600 WiFi split equally among all',
                    'Bought 200 snacks for Saurav',
                  ].map((eg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTranscript(eg)}
                      className="text-left text-xs bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md border border-border transition-colors"
                    >
                      "{eg}"
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Notice: Speech is transcribed in-browser and converted into structured expense fields. You must review and confirm details before any transaction is saved.
              </p>

              {/* AI Parse Button */}
              <Button
                type="button"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={handleParseSpeech}
                disabled={isProcessing || (!transcript.trim() && !interimText.trim())}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing expense details...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Parse & Review Details
                  </>
                )}
              </Button>
            </>
          )}

          {/* Parsed Result Confirmation Card */}
          {parsedExpense && !successMsg && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Review Parsed Details
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </button>
              </div>

              <div className="rounded-lg border border-border bg-surface-subtle/50 p-5 space-y-4">
                {/* Expense Type Badge & Total Amount */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    {parsedExpense.expense_type === 'personal' && (
                      <Badge variant="outline" className="border-border text-foreground">
                        Personal Expense
                      </Badge>
                    )}
                    {parsedExpense.expense_type === 'on_behalf' && (
                      <Badge variant="outline" className="border-primary/40 bg-brand-soft text-primary">
                        Purchased For Others
                      </Badge>
                    )}
                    {parsedExpense.expense_type === 'common' && (
                      <Badge variant="outline" className="border-border text-foreground">
                        Shared Common Expense
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {formatPaise(parsedExpense.amount_paise)}
                  </div>
                </div>

                {/* Description & Category */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="text-base font-semibold text-foreground">
                    {parsedExpense.description}
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground bg-card p-2.5 rounded-lg border border-border">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{parsedExpense.expense_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground bg-card p-2.5 rounded-lg border border-border">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{parsedExpense.category || 'General'}</span>
                  </div>
                </div>

                {/* On-behalf Items Breakdown */}
                {parsedExpense.expense_type === 'on_behalf' &&
                  parsedExpense.items &&
                  parsedExpense.items.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Flatmate Breakdown ({parsedExpense.items.length} items):
                      </div>
                      <div className="space-y-1.5">
                        {parsedExpense.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-card px-3 py-2 rounded-lg border border-border"
                          >
                            <span className="text-foreground">
                              {it.description} &bull;{' '}
                              <strong className="text-primary">
                                {it.beneficiary_name || 'Member'}
                              </strong>
                            </span>
                            <span className="font-mono font-medium text-foreground">
                              {formatPaise(it.amount_paise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Common Split Shares Breakdown */}
                {parsedExpense.expense_type === 'common' &&
                  parsedExpense.shares &&
                  parsedExpense.shares.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Participant Splits ({parsedExpense.shares.length} flatmates):
                      </div>
                      <div className="space-y-1.5">
                        {parsedExpense.shares.map((sh, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-card px-3 py-2 rounded-lg border border-border"
                          >
                            <span className="text-foreground">{sh.user_name}</span>
                            <span className="font-mono font-medium text-foreground">
                              {formatPaise(sh.amount_paise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {parsedExpense.summary && (
                  <div className="text-[11px] text-muted-foreground bg-surface-subtle p-2.5 rounded-lg border border-border">
                    {parsedExpense.summary}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="w-full sm:flex-1 min-h-11 border-border text-foreground hover:bg-muted"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveExpense}
                  disabled={isSaving}
                  className="w-full sm:flex-1 min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
