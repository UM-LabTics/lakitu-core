export async function getParkingLots() {
    await sleep(1500); // Simulate network delay

    // Simulated parking lot data
    return [
        { id: "p01", name: "Edificio Parque de Innovación del LATU" },
        { id: "mock-01", name: "mock parking lot" },
        { id: "p02", name: "Another Parking Lot" },
        { id: "p03", name: "Yet Another Parking Lot" },
        { id: "p04", name: "Yet Yet Another Parking Lot"},
        { id: "p05", name: "Parking Lot 5" },
        { id: "p06", name: "Parking Lot 6" },
        { id: "p07", name: "Parking Lot 7" },
        { id: "p08", name: "Parking Lot 8" },
        { id: "p09", name: "Parking Lot 9" },
        { id: "p10", name: "Parking Lot 10" },
    ];
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}