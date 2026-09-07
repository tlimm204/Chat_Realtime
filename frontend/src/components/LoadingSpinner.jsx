export default function LoadingSpinner({ label = "Đang tải...", small = false }) {
  return (
    <span className={`loading-inline ${small ? "small" : ""}`}>
      <span className="loading-spinner" />
      {label}
    </span>
  );
}
