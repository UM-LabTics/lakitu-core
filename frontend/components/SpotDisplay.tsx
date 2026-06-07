import { AccessibilityIcon } from "lucide-react";

export default function SpotDisplay({
  occupied,
  accessibility,
  width,
  height,
}: {
  occupied:      boolean;
  accessibility: boolean;
  width?:        number;
  height?:       number;
}) {
  const iconSize = width !== undefined ? Math.round(width * 0.6) : 16;

  return (
    <div
      className={`flex justify-center items-center overflow-hidden ${
        occupied ? "bg-occupied" : "bg-primary-light"
      }`}
      style={
        width !== undefined && height !== undefined
          ? { width, height, borderRadius: width / 10 }
          : { aspectRatio: "1 / 2" }
      }
    >
      {accessibility && (
        <AccessibilityIcon
          size={iconSize}
          className={occupied ? "text-on-occupied" : "text-primary-super-light"}
        />
      )}
    </div>
  );
}