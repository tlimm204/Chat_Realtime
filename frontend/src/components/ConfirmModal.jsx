export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Xác nhận",
  onConfirm,
  onCancel,
  danger = false,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        className="confirm-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="modal-actions">
          <button onClick={onCancel}>Hủy</button>
          <button
            className={danger ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
