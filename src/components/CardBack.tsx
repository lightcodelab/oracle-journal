import { useEffect, useRef } from "react";
import cardBackImage from "@/assets/card-back-v2.png";

interface CardBackProps {
  imageSrc?: string;
  /** Called once this image has actually painted-ready (loaded and decoded). */
  onReady?: () => void;
}

export const CardBack = ({ imageSrc = cardBackImage, onReady }: CardBackProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const reportedRef = useRef(false);

  const report = () => {
    if (reportedRef.current || !onReady) return;
    const img = imgRef.current;
    if (!img) return;
    reportedRef.current = true;
    img.decode().catch(() => undefined).finally(() => onReady());
  };

  useEffect(() => {
    reportedRef.current = false;
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Card back"
        className="w-full h-full object-cover"
        decoding="sync"
        onLoad={report}
      />
    </div>
  );
};
