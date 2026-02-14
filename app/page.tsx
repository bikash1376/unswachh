"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { ReportDialog } from "@/components/ReportDialog";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Info, Download, Navigation, ExternalLink, Menu, Twitter, Eye, Flame } from "lucide-react";
import { BiUpvote, BiSolidUpvote, BiDownvote, BiSolidDownvote } from "react-icons/bi";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";

interface Report {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  locationName: string;
  latitude: number;
  longitude: number;
  status: string;
  upvotes: number;
}

// Wrap the home content in Suspense to handle searchParams properly in Next.js
export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground">Loading Map...</div>}>
      <MapContent />
    </Suspense>
  );
}

function MapContent() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [views, setViews] = useState<number>(0);
  const mapRef = useRef<any>(null);
  const searchParams = useSearchParams();

  // Initial Map View
  const [mapView, setMapView] = useState({
    center: [78.9629, 20.5937] as [number, number],
    zoom: 4
  });

  useEffect(() => {
    // 1. Increment and fetch views
    const updateViews = async () => {
      const statsRef = doc(db, "stats", "website");
      try {
        await setDoc(statsRef, { views: increment(1) }, { merge: true });
        const snap = await getDoc(statsRef);
        if (snap.exists()) {
          setViews(snap.data().views || 0);
        }
      } catch (e) {
        console.error("Failed to update views", e);
      }
    };
    updateViews();

    // 2. Check for query parameters to center map
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const zoom = searchParams.get('zoom');

    if (lat && lng) {
      const lonNum = parseFloat(lng);
      const latNum = parseFloat(lat);
      setMapView({
        center: [lonNum, latNum],
        zoom: zoom ? parseFloat(zoom) : 18
      });
      setSelectedCoords([lonNum, latNum]);
    }

    // Load votes from localStorage
    const saved = localStorage.getItem("not_so_swachh_votes");
    if (saved) {
      try {
        setUserVotes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse votes", e);
      }
    }

    // Real-time listener for approved reports
    const q = query(collection(db, "reports"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Report[];
      setReports(reportsData);
    });

    return () => unsubscribe();
  }, [searchParams]);

  const handleMapClick = (e: any) => {
    const { lngLat } = e;
    setSelectedCoords([lngLat.lng, lngLat.lat]);
  };

  const handleVote = async (reportId: string, type: 'up' | 'down') => {
    const currentVote = userVotes[reportId];

    if (currentVote === type) {
      toast.info(`You've already ${type}voted this issue!`);
      return;
    }

    try {
      const reportRef = doc(db, "reports", reportId);

      // Calculate vote change
      let change = 0;
      if (!currentVote) {
        change = type === 'up' ? 1 : -1;
      } else {
        // Changing from up to down or vice versa
        change = type === 'up' ? 2 : -2;
      }

      await updateDoc(reportRef, {
        upvotes: increment(change),
      });

      const newUserVotes = { ...userVotes, [reportId]: type };
      setUserVotes(newUserVotes);
      localStorage.setItem("not_so_swachh_votes", JSON.stringify(newUserVotes));
      toast.success(type === 'up' ? "Upvoted!" : "Downvoted!");
    } catch (error) {
      toast.error("Failed to process vote.");
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error("Failed to download image.");
    }
  };

  return (
    <main className="relative w-full h-screen bg-background overflow-hidden font-sans">
      <Map
        ref={mapRef}
        center={mapView.center}
        zoom={mapView.zoom}
        onClick={handleMapClick}
      >
        <MapControls showLocate showZoom position="bottom-right" />

        {/* Selected Location Marker */}
        {selectedCoords && (
          <MapMarker longitude={selectedCoords[0]} latitude={selectedCoords[1]}>
            <MarkerContent>
              <div className="relative group">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-2xl transition-all scale-100 group-hover:scale-110">
                  Report here
                </div>
                <div className="h-6 w-6 rounded-full border-4 border-primary bg-background animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
              </div>
            </MarkerContent>
          </MapMarker>
        )}

        {/* Approved Reports Markers */}
        {reports.map((report) => (
          <MapMarker key={report.id} longitude={report.longitude} latitude={report.latitude}>
            <MarkerContent>
              <div className="h-5 w-5 rounded-full border-2 border-white bg-red-600 shadow-lg cursor-pointer transition-all hover:scale-125 hover:bg-red-500" />
            </MarkerContent>
            <MarkerPopup className="p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
              <Card className="w-72 border-none shadow-none bg-card">
                <div className="relative aspect-video w-full overflow-hidden bg-muted group rounded-t-2xl">
                  <img
                    src={report.imageUrl}
                    alt={report.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform"
                      onClick={() => downloadImage(report.imageUrl, `not-so-swachh-${report.id}.jpg`)}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform"
                      asChild
                    >
                      <a href={report.imageUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="font-bold text-lg leading-tight text-card-foreground line-clamp-2">{report.title}</h3>
                    <div className="flex flex-col items-center gap-0.5 min-w-[32px]">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${userVotes[report.id] === 'up' ? 'text-orange-500 bg-orange-500/10' : 'text-muted-foreground hover:text-orange-500'}`}
                        onClick={() => handleVote(report.id, 'up')}
                      >
                        {userVotes[report.id] === 'up' ? <BiSolidUpvote className="h-6 w-6" /> : <BiUpvote className="h-6 w-6" />}
                      </Button>
                      <span className={`text-xs font-black ${userVotes[report.id] === 'up' ? 'text-orange-500' : userVotes[report.id] === 'down' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                        {report.upvotes || 0}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${userVotes[report.id] === 'down' ? 'text-blue-500 bg-blue-500/10' : 'text-muted-foreground hover:text-blue-500'}`}
                        onClick={() => handleVote(report.id, 'down')}
                      >
                        {userVotes[report.id] === 'down' ? <BiSolidDownvote className="h-6 w-6" /> : <BiDownvote className="h-6 w-6" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span className="line-clamp-2 font-medium">{report.locationName || "Unknown Location"}</span>
                  </div>

                  {report.description && (
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50 mb-5 italic text-[11px] text-muted-foreground leading-relaxed">
                      "{report.description}"
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-9 gap-2 font-semibold shadow-sm rounded-xl"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        View Maps
                      </a>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="text-[11px] h-9 gap-2 font-semibold shadow-sm bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 rounded-xl"
                      asChild
                    >
                      <a
                        href="https://play.google.com/store/apps/details?id=com.ichangemycity.swachhbharat&hl=en-US"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Official Report
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MarkerPopup>
          </MapMarker>
        ))}
      </Map>

      {/* Floating Header UI */}
      <div className="absolute top-6 left-6 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl shadow-2xl backdrop-blur-md bg-background/80 border-border/50">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] border-r-border/50 bg-background/95 backdrop-blur-xl text-card-foreground">
            <SheetHeader>
              <SheetTitle className="text-3xl font-black italic tracking-tighter text-primary flex items-center">
                NOT SO SWACHH
                <a
                  href="https://x.com/bikash1376"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground hover:text-primary transition-colors ml-3 tracking-normal"
                >
                  <span className="italic font-normal">by Bikash</span>
                  {/* by XXXXXX <Twitter className="h-3 w-3 fill-current" /> */}
                </a>
              </SheetTitle>
              {/* <SheetDescription className="text-sm pt-4 leading-relaxed font-medium">
                Crowdsourcing waste and sewage issues across India. Our goal is a cleaner nation through transparent public reporting.
              </SheetDescription> */}
            </SheetHeader>
            <div className="mt-8 space-y-6">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">How to report?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Simply click anywhere on the map to mark a location, then hit the "Report Issue" button at the bottom.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] font-medium tracking-tight">
                <Link href="https://not-so-swachh.vercel.app/admin">
                  <Eye className="h-3 w-3" />
                  {views.toLocaleString()} visits
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 w-full px-6">
        <ReportDialog coordinates={selectedCoords} />

        {/* Simple Footer Text */}

      </div>
    </main>
  );
}
