import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, Monitor, Wifi, Eye, List } from 'lucide-react';

interface PreTestWarningModalProps {
  open: boolean;
  onClose: () => void;
  onProceed: (displayMode: 'single' | 'all') => void;
  test: {
    title: string;
    time_limit_hours?: number;
    time_limit_minutes?: number;
    question_papers: {
      total_questions: number;
      time_limit_minutes: number;
      subjects: { name: string };
    };
  };
}

export const PreTestWarningModal = ({ open, onClose, onProceed, test }: PreTestWarningModalProps) => {
  const [understood, setUnderstood] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [displayMode, setDisplayMode] = useState<'single' | 'all'>('single');

  // Calculate total minutes with proper fallback chain
  const getTotalMinutes = () => {
    if (test?.question_papers?.time_limit_minutes && test.question_papers.time_limit_minutes > 0) {
      return test.question_papers.time_limit_minutes;
    }
    
    if (test?.time_limit_hours || test?.time_limit_minutes) {
      const hours = test.time_limit_hours || 0;
      const minutes = test.time_limit_minutes || 0;
      return hours * 60 + minutes;
    }
    
    return 60; // Default fallback
  };

  const totalMinutes = getTotalMinutes();

  const handleNext = () => {
    if (!understood) return;
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onProceed(displayMode);
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  const resetAndClose = () => {
    setUnderstood(false);
    setShowConfirmation(false);
    setDisplayMode('single');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <AlertTriangle className="w-6 h-6 mr-2 text-warning" />
                Test Preparation - {test.title}
              </DialogTitle>
              <DialogDescription>
                Please read the following information carefully before starting your test.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Test Information */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{test.question_papers.total_questions}</div>
                      <div className="text-sm text-muted-foreground">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{totalMinutes}</div>
                      <div className="text-sm text-muted-foreground">Minutes</div>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {test.question_papers.subjects.name}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Display Mode Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Question Display Mode</Label>
                <RadioGroup value={displayMode} onValueChange={(value: 'single' | 'all') => setDisplayMode(value)}>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="single" id="single" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="single" className="flex items-start font-medium cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          <div>Single Question View (Recommended)<br />
                            <p className="text-sm text-muted-foreground mt-1">
                              View one question at a time with navigation controls. Easier to focus and less overwhelming.
                            </p>
                          </div>
                        </Label>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="all" id="all" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="all" className="flex items-start font-medium cursor-pointer">
                          <List className="w-4 h-4 mr-2" />
                          <div>All Questions View<br />
                            <p className="text-sm text-muted-foreground mt-1">
                              View all questions on a single scrollable page. Good for quick overview and jumping between questions.
                            </p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Important Warnings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-destructive flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Important Test Rules
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <Clock className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Time Limit Enforcement</div>
                      <div className="text-sm text-muted-foreground">
                        The test will automatically submit when time expires. You cannot pause or extend the time limit.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <Monitor className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Fullscreen Recommended</div>
                      <div className="text-sm text-muted-foreground">
                        For the best test experience, fullscreen mode is recommended. Exiting fullscreen may trigger security warnings.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Anti-Cheating Measures</div>
                      <div className="text-sm text-muted-foreground">
                        Tab switching, copy/paste, and right-click are disabled. Three violations will auto-submit your test.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <Wifi className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Stable Internet Required</div>
                      <div className="text-sm text-muted-foreground">
                        Ensure you have a stable internet connection. Your progress is saved automatically.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Features */}
              <div className="space-y-3">
                <h3 className="font-semibold text-primary">Available Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Navigate between questions freely</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Flag questions for review</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Question navigator panel</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Auto-save progress</span>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                <Checkbox 
                  id="understand" 
                  checked={understood} 
                  onCheckedChange={(checked) => setUnderstood(checked === true)}
                  className="mt-1"
                />
                <Label htmlFor="understand" className="text-sm cursor-pointer leading-relaxed">
                  I understand and agree to all the test rules and requirements listed above. 
                  I acknowledge that this test cannot be paused once started and that violations 
                  of the test rules may result in automatic submission.
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-y-2">
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!understood}
                className="bg-quiz hover:bg-quiz/90"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-start text-xl">
                <AlertTriangle className="w-6 h-6 mr-2 text-destructive" />
                Final Confirmation
              </DialogTitle>
              <DialogDescription className="text-left">
                You are about to start the test. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="text-left space-y-3">
                    <div className="text-center text-lg font-semibold">Ready to Start?</div>
                    <div className="md:flex text-sm text-muted-foreground space-y-1">
                      <div className="md:w-1/2">
                        <p>• Test: <strong>{test.title}</strong></p>
                        <p>• Questions: <strong>{test.question_papers.total_questions}</strong></p>
                      </div>
                      <div className="md:w-1/2">
                        <p>• Time Limit: <strong>{totalMinutes} minutes</strong></p>
                        <p>• Display Mode: <strong>{displayMode === 'single' ? 'Single Question View' : 'All Questions View'}</strong></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="text-center text-sm">
                  <div className="font-semibold text-warning mb-2">⚠️ Last Chance to Cancel</div>
                  <p>Once you click "Start Test", the timer will begin and you cannot return to this page.</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-y-2">
              <Button variant="outline" onClick={handleBack}>
                Go Back
              </Button>
              <Button variant="outline" onClick={resetAndClose}>
                Cancel Test
              </Button>
              <Button 
                onClick={handleConfirm}
                className="bg-quiz hover:bg-quiz/90"
              >
                Start Test Now
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};