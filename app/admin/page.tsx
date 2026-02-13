"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
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
import { Check, Trash2, Edit2, ExternalLink, Lock, LayoutDashboard, Navigation } from "lucide-react";

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
}

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
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

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            toast.success("Welcome, Admin");
        } else {
            toast.error("Incorrect password");
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
                    <Button variant="outline" size="sm" onClick={() => setIsAuthenticated(false)}>
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
                            </TableCell>
                            <TableCell>
                                <Badge variant={report.status === "approved" ? "default" : "secondary"}>
                                    {report.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="icon" title="View location on map" asChild>
                                        <a
                                            href={`/?lat=${report.latitude}&lng=${report.longitude}&zoom=18`}
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
