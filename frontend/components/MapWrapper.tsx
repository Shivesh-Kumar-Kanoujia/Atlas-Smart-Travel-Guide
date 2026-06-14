// @ts-nocheck
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        background: "#e8f0e8",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: "14px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      Loading map...
    </div>
  ),
});

export default function MapWrapper(props) {
  return <MapView {...props} />;
}
