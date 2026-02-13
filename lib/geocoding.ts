export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    "User-Agent": "Unswachh-App",
                },
            }
        );

        if (!response.ok) {
            throw new Error("Geocoding failed");
        }

        const data = await response.json();

        // Construct a readable address from Nominatim components
        if (!data.address) {
            return data.display_name || "Unknown Location";
        }

        const address = data.address;
        const parts = [
            address.road || address.suburb || address.neighbourhood,
            address.city || address.town || address.village,
            address.state,
        ].filter(Boolean);

        return parts.join(", ") || data.display_name || "Unknown Location";
    } catch (error) {
        console.error("Geocoding error:", error);
        return "Location unavailable";
    }
}
