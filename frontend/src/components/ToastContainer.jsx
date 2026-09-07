/* oxlint-disable react/only-export-components */
import { useEffect, useState } from "react";

export const showToast = (message, type = "success") => {
  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: { message, type },
    })
  );
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const addToast = ({ detail }) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...detail, id }]);
      setTimeout(() => {
        setToasts((current) =>
          current.filter((toast) => toast.id !== id)
        );
      }, 3500);
    };
    window.addEventListener("app-toast", addToast);
    return () => window.removeEventListener("app-toast", addToast);
  }, []);
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
