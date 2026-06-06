export interface DataPoint {
  x: number;
  y: number;
}

/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm.
 *
 * Reduces a data series to at most `threshold` points while preserving the
 * visual shape of the original series. The first and last points are always
 * retained.
 *
 * Reference: Sveinn Steinarsson, "Downsampling Time Series for Visual
 * Representation" (2013).
 *
 * @param data      Input data points, must be sorted by x ascending.
 * @param threshold Maximum number of points to return. Values <= 2 return
 *                  the original series. Values >= data.length return the
 *                  original series.
 */
export function lttb(data: DataPoint[], threshold: number): DataPoint[] {
  const length = data.length;

  if (threshold <= 2 || length <= threshold) {
    return data.slice();
  }

  const sampled: DataPoint[] = [];

  // Always include the first point.
  sampled.push(data[0]);

  // Bucket size — the first and last buckets each contain exactly one point.
  const bucketSize = (length - 2) / (threshold - 2);

  let a = 0; // Index of the previously selected point.

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate the range of the next bucket.
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(
      Math.floor((i + 2) * bucketSize) + 1,
      length,
    );

    // Average point of the next bucket (used as the "far" vertex of the triangle).
    let avgX = 0;
    let avgY = 0;
    const nextBucketSize = nextBucketEnd - nextBucketStart;
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
    }
    avgX /= nextBucketSize;
    avgY /= nextBucketSize;

    // Range of the current bucket.
    const currentBucketStart = Math.floor(i * bucketSize) + 1;
    const currentBucketEnd = Math.min(
      Math.floor((i + 1) * bucketSize) + 1,
      length,
    );

    const pointA = data[a];

    // Pick the point in the current bucket that forms the largest triangle
    // with pointA and the average of the next bucket.
    let maxArea = -1;
    let selectedIndex = currentBucketStart;

    for (let j = currentBucketStart; j < currentBucketEnd; j++) {
      const area = Math.abs(
        (pointA.x - avgX) * (data[j].y - pointA.y) -
          (pointA.x - data[j].x) * (avgY - pointA.y),
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        selectedIndex = j;
      }
    }

    sampled.push(data[selectedIndex]);
    a = selectedIndex;
  }

  // Always include the last point.
  sampled.push(data[length - 1]);

  return sampled;
}
