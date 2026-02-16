"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogAction,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, MapPin, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { compressImage, uploadToCloudinary } from "@/lib/storage";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { getAddressFromCoords } from "@/lib/geocoding";
import { calculateDistance } from "@/lib/utils";

interface ReportDialogProps {
    coordinates: [number, number] | null;
}

export function ReportDialog({ coordinates }: ReportDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [locationName, setLocationName] = useState<string>("Detecting address...");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Result modal state
    const [resultModal, setResultModal] = useState<{ type: 'success' | 'duplicate' | null; message: string }>({ type: null, message: '' });

    const [internalCoordinates, setInternalCoordinates] = useState<[number, number] | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    // Reset when dialog opens
    useEffect(() => {
        if (isOpen) {
            setInternalCoordinates(null);
            setLocationName("Please verify your location to report.");
        }
    }, [isOpen]);

    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        toast.info("Fetching your verified location...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Just for testing/demo, we can't easily fake moving 50m away from the map click,
                // but we are correctly taking the GPS location here.
                setInternalCoordinates([longitude, latitude]);
                setLocationName("Detecting address...");
                getAddressFromCoords(latitude, longitude).then(setLocationName);
                setIsLocating(false);
                toast.success("Location verified!");
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.error("Could not fetch location. Please enable permissions.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!internalCoordinates) {
            toast.error("Verified location is required. Please use 'Use My Location'.");
            return;
        }
        if (!image) {
            toast.error("Please provide an image of the area.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Proximity Check (50m)
            // Fetch existing approved/in-review reports to check proximity
            const reportsRef = collection(db, "reports");
            const snapshot = await getDocs(reportsRef);

            const tooClose = snapshot.docs.some(doc => {
                const data = doc.data();
                const dist = calculateDistance(
                    internalCoordinates[1],
                    internalCoordinates[0],
                    data.latitude,
                    data.longitude
                );
                return dist < 50; // 50 meters
            });

            if (tooClose) {
                setResultModal({
                    type: 'duplicate',
                    message: 'An issue has already been reported near this location. Please check the map for existing reports in this area.'
                });
                setIsSubmitting(false);
                return;
            }

            // 2. Compress Image
            const compressed = await compressImage(image);

            // 3. Upload to Cloudinary
            const imageUrl = await uploadToCloudinary(compressed);

            // 4. Save to Firebase
            await addDoc(collection(db, "reports"), {
                title,
                description,
                imageUrl,
                locationName,
                latitude: internalCoordinates[1],
                longitude: internalCoordinates[0],
                status: "in-review",
                upvotes: 0,
                createdAt: serverTimestamp(),
            });

            setResultModal({
                type: 'success',
                message: "Thanks for your report! It'll show up shortly after review."
            });
            setIsOpen(false);
            resetForm();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to submit report.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setImage(null);
        setImagePreview(null);
        setInternalCoordinates(null);
        setLocationName("Please verify your location to report.");
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        size="lg"
                        className="rounded-full shadow-2xl bg-background/60 backdrop-blur-xl border border-white/20 text-foreground hover:bg-background/80 hover:scale-105 transition-all h-14 mb-8 md:mb-2 px-8 text-base font-bold"
                    >
                        <Camera className="mr-3 h-6 w-6 text-primary" />
                        Report Issue
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Submit a Report</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Sewage overflow near park"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Provide more details..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Verified Location <span className="text-red-500">*</span></Label>
                                <Button
                                    type="button"
                                    variant={internalCoordinates ? "default" : "destructive"}
                                    size="sm"
                                    onClick={handleUseLocation}
                                    disabled={isLocating}
                                    className="h-7 text-xs gap-1.5"
                                >
                                    {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                                    {internalCoordinates ? "Location Verified" : "Verify Location"}
                                </Button>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                <div className="flex flex-col">
                                    <span className={internalCoordinates ? "font-medium text-foreground" : "text-muted-foreground/70 italic"}>
                                        {locationName}
                                    </span>
                                    {internalCoordinates && (
                                        <span className="text-[10px]">
                                            {internalCoordinates[1].toFixed(5)}, {internalCoordinates[0].toFixed(5)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!internalCoordinates && (
                                <p className="text-[10px] text-destructive font-medium">
                                    You must be at the location to report it.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Evidence Image</Label>
                            <div className="flex flex-col items-center gap-4">
                                {imagePreview ? (
                                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                setImage(null);
                                                setImagePreview(null);
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="w-full border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground text-center">
                                            Click to upload or take a photo
                                        </p>
                                        <Input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !internalCoordinates}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Report"
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Result Confirmation Modal */}
            <AlertDialog open={resultModal.type !== null} onOpenChange={(open) => {
                if (!open) setResultModal({ type: null, message: '' });
            }}>
                <AlertDialogContent className="max-w-[320px] sm:max-w-[360px] rounded-2xl">
                    <AlertDialogTitle className="sr-only">
                        {resultModal.type === 'success' ? 'Report Submitted' : 'Already Reported'}
                    </AlertDialogTitle>
                    <div className="flex flex-col items-center justify-center py-4 space-y-3">
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${resultModal.type === 'success'
                            ? 'bg-green-500/10'
                            : 'bg-amber-500/10'
                            }`}>
                            {resultModal.type === 'success' ? (
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            ) : (
                                <AlertTriangle className="h-8 w-8 text-amber-500" />
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-center">
                            {resultModal.type === 'success' ? 'Report Submitted!' : 'Already Reported'}
                        </h3>
                        <p className="text-base text-muted-foreground text-center leading-relaxed">
                            {resultModal.message}
                        </p>
                        <AlertDialogAction
                            className={`mt-3 rounded-xl px-10 h-11 text-sm font-semibold cursor-pointer ${resultModal.type === 'success'
                                ? 'bg-green-600 hover:bg-green-700'
                                : ''
                                }`}
                            onClick={() => setResultModal({ type: null, message: '' })}
                        >
                            {resultModal.type === 'success' ? 'Done' : 'Got it'}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
