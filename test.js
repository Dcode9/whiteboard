function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function orientation(a, b, c) {
    const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
}

function isPointOnSegment(a, b, c) {
    return Math.min(a.x, c.x) <= b.x + 1e-9 && b.x <= Math.max(a.x, c.x) + 1e-9 &&
            Math.min(a.y, c.y) <= b.y + 1e-9 && b.y <= Math.max(a.y, c.y) + 1e-9;
}

function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && isPointOnSegment(p1, p2, q1)) return true;
    if (o2 === 0 && isPointOnSegment(p1, q2, q1)) return true;
    if (o3 === 0 && isPointOnSegment(p2, p1, q2)) return true;
    if (o4 === 0 && isPointOnSegment(p2, q1, q2)) return true;
    return false;
}

function distancePointToSegment(point, segmentStart, segmentEnd) {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    if (dx === 0 && dy === 0) return getDistance(point, segmentStart);
    const t = Math.max(0, Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy)));
    return getDistance(point, {
        x: segmentStart.x + t * dx,
        y: segmentStart.y + t * dy,
    });
}

function pathIntersectsStroke(pathPoints, stroke, tolerance = 6) {
    if (!stroke || stroke.tool !== 'pen' || !stroke.points || stroke.points.length === 0) return false;
    const strokeSegments = [];
    for (let i = 1; i < stroke.points.length; i++) {
        strokeSegments.push([stroke.points[i - 1], stroke.points[i]]);
    }
    
    const cutPoints = pathPoints;
    for (let i = 1; i < cutPoints.length; i++) {
        const cutStart = cutPoints[i - 1];
        const cutEnd = cutPoints[i];
        for (const [strokeStart, strokeEnd] of strokeSegments) {
            if (segmentsIntersect(cutStart, cutEnd, strokeStart, strokeEnd)) return true;
            const thisTolerance = tolerance + (stroke.size ? stroke.size / 2 : 0);
            if (distancePointToSegment(cutStart, strokeStart, strokeEnd) <= thisTolerance) return true;
            if (distancePointToSegment(cutEnd, strokeStart, strokeEnd) <= thisTolerance) return true;
            if (distancePointToSegment(strokeStart, cutStart, cutEnd) <= thisTolerance) return true;
            if (distancePointToSegment(strokeEnd, cutStart, cutEnd) <= thisTolerance) return true;
        }
    }
    return false;
}

const stroke = {tool: 'pen', points: [{x: 0, y: 0}, {x: 100, y: 100}], size: 5};
const cut = [{x: 0, y: 100}, {x: 100, y: 0}];

console.log('Intersects?', pathIntersectsStroke(cut, stroke, 5));

