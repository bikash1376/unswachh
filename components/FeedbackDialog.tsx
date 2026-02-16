"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, CheckCircle2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

export function FeedbackDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleClose = () => {
        setIsOpen(false);
        // Reset after animation
        setTimeout(() => setIsSubmitted(false), 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setTimeout(() => setIsSubmitted(false), 300);
        }}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Send Feedback
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
                {isSubmitted ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-center">Thank you!</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-[250px]">
                            Your feedback has been submitted successfully. We appreciate your input!
                        </p>
                        <Button
                            variant="outline"
                            className="mt-2 rounded-xl"
                            onClick={handleClose}
                        >
                            Close
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Send Feedback</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Found a problem or have a suggestion? Let us know so we can improve Unswachh.
                            </p>
                        </DialogHeader>
                        <form
                            className="space-y-4 pt-2"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setIsFeedbackSubmitting(true);
                                const form = e.currentTarget;
                                const formData = new FormData(form);

                                try {
                                    const response = await fetch("https://formspree.io/f/xzdrkqyg", {
                                        method: "POST",
                                        body: formData,
                                        headers: {
                                            Accept: "application/json",
                                        },
                                    });

                                    if (response.ok) {
                                        form.reset();
                                        setIsSubmitted(true);
                                    } else {
                                        alert("Oops! There was a problem submitting your feedback.");
                                    }
                                } catch (error) {
                                    alert("Oops! There was a problem submitting your feedback.");
                                } finally {
                                    setIsFeedbackSubmitting(false);
                                }
                            }}
                        >
                            {/* Hidden field to identify source */}
                            <input type="hidden" name="_source" value="Unswachh Feedback" />

                            <div className="space-y-2">
                                <label htmlFor="feedback-name" className="text-xs font-bold uppercase text-muted-foreground">
                                    Name
                                </label>
                                <Input
                                    id="feedback-name"
                                    name="name"
                                    placeholder="Anonymous"
                                    defaultValue="Anonymous"
                                    className="bg-secondary/50 text-foreground rounded-lg"
                                    disabled={isFeedbackSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="feedback-message" className="text-xs font-bold uppercase text-muted-foreground">
                                    Message <span className="text-destructive">*</span>
                                </label>
                                <TextareaAutosize
                                    id="feedback-message"
                                    name="message"
                                    required
                                    minRows={3}
                                    placeholder="Describe the issue or share your feedback..."
                                    className="w-full bg-secondary/50 border border-border/40 text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none disabled:opacity-50"
                                    disabled={isFeedbackSubmitting}
                                />
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    className="font-medium text-xs h-9 px-6 rounded-lg disabled:opacity-70"
                                    disabled={isFeedbackSubmitting}
                                >
                                    {isFeedbackSubmitting ? "Sending..." : "Send Feedback"}
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
