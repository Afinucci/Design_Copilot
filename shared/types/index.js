"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCleanroomColor = getCleanroomColor;
function getCleanroomColor(cleanroomClass) {
    if (!cleanroomClass) {
        return '#D3D3D3'; // Default light gray for unclassified
    }
    const normalizedClass = cleanroomClass.toUpperCase().trim();
    switch (normalizedClass) {
        case 'A':
        case 'GRADE A':
        case 'CLASS A':
            return '#DC143C'; // Crimson Red - Most critical
        case 'B':
        case 'GRADE B':
        case 'CLASS B':
            return '#FFA500'; // Orange - Aseptic preparation
        case 'C':
        case 'GRADE C':
        case 'CLASS C':
            return '#4A90E2'; // Sky Blue - Less critical
        case 'D':
        case 'GRADE D':
        case 'CLASS D':
            return '#90EE90'; // Light Green - General manufacturing
        case 'CNC':
        case 'CONTROLLED NOT CLASSIFIED':
        case 'N/A':
            return '#D3D3D3'; // Light Gray - Non-classified
        default:
            return '#D3D3D3'; // Default light gray for unknown
    }
}
//# sourceMappingURL=index.js.map