"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface Report {
    id: string;
    locationName: string;
    latitude: number;
    longitude: number;
}

interface LocationsAccordionProps {
    reports: Report[];
    onSelectLocation: (lat: number, lng: number, reportId: string) => void;
}

export function LocationsAccordion({ reports, onSelectLocation }: LocationsAccordionProps) {
    const groupedReports = reports.reduce((acc, report) => {
        const parts = (report.locationName || "").split(",").map((p) => p.trim());

        let state = "Other";
        if (parts.length >= 2) {
            // Try to identify state. Often it is 2nd or 3rd from last.
            // E.g. "Area, City, State, Country, Zip" -> State is index 2 (length-3) or 3 (length-2).
            // Let's try to grab the part before the last one (Country).
            const potentialState = parts[parts.length - 2];
            if (isNaN(Number(potentialState))) {
                state = potentialState;
            } else {
                state = parts[parts.length - 3] || "Other";
            }
        } else if (parts.length === 1 && parts[0]) {
            state = parts[0];
        }

        if (!acc[state]) {
            acc[state] = [];
        }
        acc[state].push(report);
        return acc;
    }, {} as Record<string, Report[]>);

    const sortedStates = Object.keys(groupedReports).sort();

    return (
        <Accordion type="single" collapsible className="w-full">
            {sortedStates.map((state) => (
                <AccordionItem key={state} value={state}>
                    <AccordionTrigger className="text-sm font-semibold px-1 py-2">
                        {state} ({groupedReports[state].length})
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-1 p-1">
                        {groupedReports[state].map((report) => (
                            <Button
                                key={report.id}
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto py-2 px-2 text-xs text-left font-normal whitespace-normal hover:bg-muted/50"
                                onClick={() => onSelectLocation(report.latitude, report.longitude, report.id)}
                            >
                                <MapPin className="h-3 w-3 mr-2 shrink-0 opacity-50 text-primary" />
                                <span className="line-clamp-2">
                                    {report.locationName}
                                </span>
                            </Button>
                        ))}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
