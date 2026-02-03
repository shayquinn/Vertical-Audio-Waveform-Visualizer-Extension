// Update which bar is being hovered based on mouse Y position
if (hoverY !== null) {
    // Calculate which bar the mouse is over
    if (Math.abs(hoverY - centerY) < barHeight / 2) {
        // Mouse is over center bar
        hoveredBarIndex = 0;
    } else if (hoverY < centerY) {
        // Mouse is in top half
        const distanceFromCenter = centerY - hoverY;
        const barIndexFromTop = Math.floor(distanceFromCenter / barHeight);
        hoveredBarIndex = barIndexFromTop * 2 - 1; // Top bars use odd indices
    } else {
        // Mouse is in bottom half  
        const distanceFromCenter = hoverY - centerY;
        const barIndexFromBottom = Math.floor(distanceFromCenter / barHeight);
        hoveredBarIndex = barIndexFromBottom * 2; // Bottom bars use even indices
    }
} else {
    hoveredBarIndex = null;
}