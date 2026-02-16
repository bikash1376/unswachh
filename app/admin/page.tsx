"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { verifyAdminPassword } from "@/app/actions";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
} from "firebase/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, Trash2, Edit2, ExternalLink, Lock, LayoutDashboard, Navigation, Download, Link2 } from "lucide-react";

interface Report {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    locationName?: string;
    latitude: number;
    longitude: number;
    status: "in-review" | "approved";
    createdAt: any;
    twitterLink?: string;
}

function generateTweetUrl(report: Report): string {
    const lines: string[] = [];
    lines.push(`🚨 Unswachh Report: ${report.title}`);
    if (report.description) {
        lines.push(`"${report.description}"`);
    }
    lines.push(`📍 ${report.locationName || 'Unknown Location'}`);
    lines.push(`🗺️ https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`);
    lines.push(``);
    lines.push(`@tag_respected_authority`);
    lines.push(`#Unswachh #SwachhBharat #CleanIndia`);

    const text = lines.join('\n');
    const encodedText = encodeURIComponent(text);
    const url = encodeURIComponent(`https://unswachh.vercel.app/?lat=${report.latitude}&lng=${report.longitude}&zoom=18`);
    return `https://x.com/intent/tweet?text=${encodedText}&url=${url}`;
}

function downloadImage(imageUrl: string, filename: string) {
    fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        })
        .catch(() => toast.error('Failed to download image.'));
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('unswachh_admin') === 'true';
        }
        return false;
    });
    const [password, setPassword] = useState("");
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reportsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Report[];
            setReports(reportsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const isValid = await verifyAdminPassword(password);
            if (isValid) {
                setIsAuthenticated(true);
                sessionStorage.setItem('unswachh_admin', 'true');
                toast.success("Welcome, Admin");
            } else {
                toast.error("Incorrect password");
            }
        } catch (error) {
            console.error(error);
            toast.error("Login failed due to an error.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await updateDoc(doc(db, "reports", id), { status: "approved" });
            toast.success("Report approved");
        } catch (error) {
            toast.error("Failed to approve");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, "reports", id));
            toast.success("Report deleted");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/30">
                <Card className="w-full max-w-sm shadow-2xl border-none">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-black">Admin Access</CardTitle>
                        <CardDescription>Enter password to manage reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const inReview = reports.filter((r) => r.status === "in-review");
    const approved = reports.filter((r) => r.status === "approved");

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold tracking-tight">Unswachh Admin</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                        setIsAuthenticated(false);
                        sessionStorage.removeItem('unswachh_admin');
                    }}>
                        Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <Tabs defaultValue="review" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                        <TabsTrigger value="review" className="relative">
                            In Review
                            {inReview.length > 0 && (
                                <Badge variant="destructive" className="ml-2 px-1.5 py-0 min-w-[1.2rem] h-5 justify-center">
                                    {inReview.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                    </TabsList>

                    <TabsContent value="review">
                        <ReportTable reports={inReview} onApprove={handleApprove} onDelete={handleDelete} />
                    </TabsContent>
                    <TabsContent value="approved">
                        <ReportTable reports={approved} onDelete={handleDelete} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

function ReportTable({
    reports,
    onApprove,
    onDelete,
}: {
    reports: Report[];
    onApprove?: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const [editingLink, setEditingLink] = useState<string | null>(null);
    const [linkValue, setLinkValue] = useState("");
    if (reports.length === 0) {
        return (
            <Card className="border-dashed py-20 text-center">
                <CardContent>
                    <p className="text-muted-foreground">No reports found in this category.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Image</TableHead>
                        <TableHead>Title & Details</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.map((report) => (
                        <TableRow key={report.id}>
                            <TableCell>
                                <div className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                                    <img src={report.imageUrl} alt="" className="object-cover w-full h-full" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">{report.title}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                    {report.description || "No description"}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    {report.createdAt?.toDate().toLocaleString()}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm font-medium leading-tight">
                                    {report.locationName || "Unknown Location"}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground mt-1">
                                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                                </div>
                                <div className="mt-1.5">
                                    {editingLink === report.id ? (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={linkValue}
                                                onChange={(e) => setLinkValue(e.target.value)}
                                                placeholder="https://x.com/..."
                                                className="h-7 text-[11px] w-40"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') setEditingLink(null);
                                                }}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 shrink-0"
                                                onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, "reports", report.id), { twitterLink: linkValue || null });
                                                        toast.success("Link saved");
                                                        setEditingLink(null);
                                                    } catch {
                                                        toast.error("Failed to save link");
                                                    }
                                                }}
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <button
                                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => {
                                                setEditingLink(report.id);
                                                setLinkValue(report.twitterLink || "");
                                            }}
                                        >
                                            <Link2 className="h-3 w-3" />
                                            {report.twitterLink ? (
                                                <span className="underline truncate max-w-[120px]">{report.twitterLink}</span>
                                            ) : (
                                                <span className="italic">Add tweet link</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={report.status === "approved" ? "default" : "secondary"}>
                                    {report.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2 flex-wrap">
                                    <Button variant="outline" size="icon" title="View location on map" asChild>
                                        <a
                                            href={`/?lat=${report.latitude}&lng=${report.longitude}&zoom=18&reportId=${report.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Navigation className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="icon" title="View original image" asChild>
                                        <a href={report.imageUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        title="Download image"
                                        onClick={() => downloadImage(report.imageUrl, `unswachh-${report.id}.jpg`)}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    {report.status === "approved" && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Tweet this report on X"
                                            asChild
                                            className="text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950"
                                        >
                                            <a
                                                href={generateTweetUrl(report)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                </svg>
                                            </a>
                                        </Button>
                                    )}
                                    {onApprove && report.status === "in-review" && (
                                        <Button
                                            variant="default"
                                            size="icon"
                                            title="Approve report"
                                            onClick={() => onApprove(report.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    )}

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the report and remove it from the map.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => onDelete(report.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
