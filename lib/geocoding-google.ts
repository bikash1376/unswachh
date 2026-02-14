// lib/geocoding-google.ts

/**
 * GOOGLE MAPS GEOCODING (Optional)
 * 
 * To use this instead of Nominatim (OpenStreetMap):
 * 1. Get an API Key from Google Cloud Platform with 'Geocoding API' enabled.
 * 2. Add NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key to .env.local
 * 3. Replace the import in components/ReportDialog.tsx:
 *    import { getAddressFromCoords } from "@/lib/geocoding-google";
 */

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    if (!apiKey) {
        console.warn("Google Maps API Key not found. Usage of this function requires NEXT_PUBLIC_GOOGLE_MAPS_KEY.");
        return "Google Maps Key Missing";
    }

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const data = await response.json();

        if (data.status === "OK" && data.results.length > 0) {
            // Google usually returns the most relevant address first (e.g., "Starbucks, Connaught Place")
            // You can also look for specific types like 'point_of_interest' or 'establishment'

            // 1. Try to find a precise establishment/point_of_interest
            const specificResult = data.results.find((r: any) =>
                r.types.includes("point_of_interest") || r.types.includes("establishment")
            );

            if (specificResult) {
                return specificResult.formatted_address;
            }

            // 2. Fallback to the first result (usually a street address)
            return data.results[0].formatted_address;
        } else {
            console.error("Google Geocoding failed:", data.status, data.error_message);
            return "Unknown Location";
        }
    } catch (error) {
        console.error("Geocoding network error:", error);
        return "Location unavailable";
    }
}
