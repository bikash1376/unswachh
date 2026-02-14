export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    "User-Agent": "NotSoSwachh-App",
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

        // Prioritize specific location names
        const specificName = address.amenity || address.shop || address.building || address.tourism || address.historic || address.leisure;

        const parts = [
            specificName, // e.g. "Taj Mahal" or "Starbucks"
            address.house_number,
            address.road || address.pedestrian || address.footway,
            address.suburb || address.neighbourhood || address.residential,
            address.city || address.town || address.village || address.county,
            address.state
        ].filter(Boolean); // Remove undefined/null/empty strings

        // formatted address or fallback to display_name
        return parts.length > 0 ? parts.join(", ") : (data.display_name || "Unknown Location");
    } catch (error) {
        console.error("Geocoding error:", error);
        return "Location unavailable";
    }
}
