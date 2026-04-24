// Utils
export function parseChainage(chainage) {
    if (!chainage)
        return 0;
    const match = chainage.match(/(\d+)\+(\d{3})/);
    if (!match) {
        // Try to parse as simple number if possible, or return 0
        const num = parseInt(chainage);
        return isNaN(num) ? 0 : num;
    }
    return parseInt(match[1]) * 1000 + parseInt(match[2]);
}
export function formatChainage(meters) {
    const km = Math.floor(meters / 1000);
    const m = Math.floor(meters % 1000).toString().padStart(3, '0');
    return `${km}+${m}`;
}
// Snap structure chainage to nearest common across alignments
export function snapToCommonChainage(structureChainage, alignments) {
    // const dist = parseChainage(structureChainage);
    // Find closest matching chainage in all alignments
    // Implementation in roadService
    return structureChainage; // placeholder
}
