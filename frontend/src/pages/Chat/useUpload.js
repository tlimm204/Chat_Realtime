import { useRef, useState } from "react";
import { uploadMessageAttachment } from "../../services/messageService";
import { showToast } from "../../components/ToastContainer";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGES_PER_MESSAGE,
  MAX_IMAGE_SIZE,
  VOICE_RECORDING_LIMIT,
} from "./chatConstants";
import { appendUniqueMessage } from "./chatHelpers";

const getMediaErrorMessage = (error, deviceName) => {
  if (!window.isSecureContext) {
    return `${deviceName} chỉ hoạt động trên localhost hoặc kết nối HTTPS`;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return `Trình duyệt không hỗ trợ sử dụng ${deviceName}`;
  }

  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return `Chrome đang chặn ${deviceName}. Hãy cho phép quyền trong biểu tượng bên trái thanh địa chỉ`;
  }

  if (error?.name === "NotFoundError") {
    return `Không tìm thấy ${deviceName} trên thiết bị`;
  }

  if (error?.name === "NotReadableError") {
    return `${deviceName} đang được ứng dụng khác sử dụng`;
  }

  return `Không thể sử dụng ${deviceName}: ${error?.message || "lỗi không xác định"}`;
};

const getSupportedAudioMimeType = () => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

// Kiểm tra số lượng, định dạng và dung lượng ảnh trước khi upload.
const validateImageFiles = (files) => {
  if (files.length > MAX_IMAGES_PER_MESSAGE) {
    return `Mỗi lần chỉ được gửi tối đa ${MAX_IMAGES_PER_MESSAGE} ảnh`;
  }

  if (files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type))) {
    return "Chỉ chấp nhận JPG, PNG, GIF hoặc WEBP";
  }

  if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
    return "Ảnh không được lớn hơn 5 MB";
  }

  return "";
};

// Quản lý toàn bộ ảnh xem trước, tệp đính kèm và ghi âm voice.
export default function useUpload({
  selectedRoom,
  setMessages,
  setMessageError,
}) {
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceTimeoutRef = useRef(null);

  // Thêm tin upload vào danh sách nhưng không tạo bản ghi trùng.
  const appendUploadedMessage = (message) => {
    setMessages((current) => appendUniqueMessage(current, message));
  };

  // Giải phóng Object URL để tránh giữ ảnh trong bộ nhớ trình duyệt.
  const revokePreviews = (previews) => {
    previews.forEach((preview) => URL.revokeObjectURL(preview));
  };

  // Phân loại ảnh và tệp từ cùng một input rồi xử lý theo từng loại.
  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const attachmentFiles = files.filter(
      (file) => !file.type.startsWith("image/")
    );
    const validationError = validateImageFiles(imageFiles);

    if (validationError) {
      setMessageError(validationError);
      event.target.value = "";
      return;
    }

    if (imageFiles.length) {
      revokePreviews(imagePreviews);
      setSelectedImages(imageFiles);
      setImagePreviews(
        imageFiles.map((file) => URL.createObjectURL(file))
      );
    }

    setMessageError("");

    if (!attachmentFiles.length || !selectedRoom?._id) {
      return;
    }

    try {
      setUploadingAttachment(true);

      for (const file of attachmentFiles) {
        const result = await uploadMessageAttachment(selectedRoom._id, file);
        appendUploadedMessage(result.data);
      }

      showToast(
        attachmentFiles.length > 1
          ? `Đã gửi ${attachmentFiles.length} tệp`
          : "Gửi tệp thành công"
      );
    } catch (error) {
      showToast(
        error.response?.data?.message || "Không thể gửi tệp",
        "error"
      );
    } finally {
      setUploadingAttachment(false);

      if (!imageFiles.length) {
        event.target.value = "";
      }
    }
  };

  // Xóa một ảnh xem trước hoặc xóa toàn bộ ảnh đang chờ gửi.
  const handleRemoveImage = (index = null) => {
    if (index !== null) {
      URL.revokeObjectURL(imagePreviews[index]);
      setSelectedImages((current) =>
        current.filter((_, itemIndex) => itemIndex !== index)
      );
      setImagePreviews((current) =>
        current.filter((_, itemIndex) => itemIndex !== index)
      );
      return;
    }

    revokePreviews(imagePreviews);
    setSelectedImages([]);
    setImagePreviews([]);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Bắt đầu, dừng và upload đoạn ghi âm từ microphone.
  const handleVoiceRecording = async () => {
    if (recordingVoice) {
      clearTimeout(voiceTimeoutRef.current);

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      return;
    }

    if (!selectedRoom?._id) {
      showToast("Hãy chọn phòng chat trước khi ghi âm", "warning");
      return;
    }

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Trang không có quyền truy cập thiết bị", "SecurityError");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      voiceChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearTimeout(voiceTimeoutRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecordingVoice(false);
        mediaRecorderRef.current = null;

        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size < 1000) {
          showToast("Đoạn ghi âm quá ngắn", "warning");
          return;
        }

        const voiceFile = new File(
          [blob],
          `voice-${Date.now()}.${blob.type.includes("ogg") ? "ogg" : "webm"}`,
          { type: blob.type || "audio/webm" }
        );

        try {
          setUploadingAttachment(true);
          const result = await uploadMessageAttachment(
            selectedRoom._id,
            voiceFile
          );
          appendUploadedMessage(result.data);
          showToast("Gửi voice thành công");
        } catch (error) {
          showToast(
            error.response?.data?.message || "Không thể gửi voice",
            "error"
          );
        } finally {
          setUploadingAttachment(false);
        }
      };

      recorder.onerror = (event) => {
        clearTimeout(voiceTimeoutRef.current);
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setRecordingVoice(false);
        showToast(
          `Ghi âm bị lỗi: ${event.error?.message || "không xác định"}`,
          "error"
        );
      };

      recorder.start(250);
      setRecordingVoice(true);
      voiceTimeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, VOICE_RECORDING_LIMIT);
      showToast("Đang ghi âm, nhấn lại để gửi", "warning");
    } catch (error) {
      showToast(getMediaErrorMessage(error, "microphone"), "error");
    }
  };

  return {
    uploadingAttachment,
    recordingVoice,
    selectedImages,
    imagePreviews,
    imageInputRef,
    handleAttachmentChange,
    handleRemoveImage,
    handleVoiceRecording,
  };
}
