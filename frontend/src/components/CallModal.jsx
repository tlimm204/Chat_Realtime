/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import { showToast } from "./ToastContainer";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const getCallMediaError = (error, type) => {
  const devices = type === "video" ? "camera và microphone" : "microphone";

  if (!window.isSecureContext) {
    return `${devices} chỉ hoạt động trên localhost hoặc kết nối HTTPS`;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return `Trình duyệt không hỗ trợ ${devices}`;
  }

  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return `Chrome đang chặn ${devices}. Hãy cấp quyền trong biểu tượng bên trái thanh địa chỉ`;
  }

  if (error?.name === "NotFoundError") {
    return `Không tìm thấy ${devices} trên thiết bị`;
  }

  if (error?.name === "NotReadableError") {
    return `${devices} đang được ứng dụng khác sử dụng`;
  }

  return `Không thể mở ${devices}: ${error?.message || "lỗi không xác định"}`;
};

export default function CallModal({ room, user, disabled = false }) {
  const [callState, setCallState] = useState("idle");
  const [incoming, setIncoming] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callType, setCallType] = useState("voice");
  const callTypeRef = useRef("voice");
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const peerIdRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  const getMedia = async (type = callTypeRef.current) => {
    if (streamRef.current) return streamRef.current;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new DOMException("Trang không có quyền truy cập thiết bị", "SecurityError");
    }

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
    } catch (error) {
      if (type !== "video" || error?.name !== "NotFoundError") {
        throw error;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      showToast(
        "Không tìm thấy microphone, cuộc gọi video sẽ không có tiếng",
        "warning"
      );
    }

    streamRef.current = stream;
    return stream;
  };

  const createPeer = async (peerId, type = callTypeRef.current) => {
    peerRef.current?.close();
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;
    peerIdRef.current = peerId;
    const stream = await getMedia(type);
    stream
      .getTracks()
      .forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }

      if (type === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }

      if (type === "voice" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setCallState("active");
      }

      if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
        setCallState((current) => current === "idle" ? current : "connecting");
      }
    };
    return peer;
  };

  const addPendingIceCandidates = async (peer) => {
    const candidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  };

  const cleanup = (notify = false) => {
    if (notify && room?._id) {
      socket.emit("endCall", { roomId: room._id });
    }
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    peerIdRef.current = null;
    pendingIceCandidatesRef.current = [];
    setIncoming(null);
    setCallState("idle");
    setMuted(false);
    setCameraOff(false);
    setCallType("voice");
    callTypeRef.current = "voice";
  };

  const startCall = async (type) => {
    try {
      if (!room?._id || !socket.connected) {
        showToast("Chưa kết nối được máy chủ cuộc gọi", "error");
        return;
      }

      setCallType(type);
      callTypeRef.current = type;
      await getMedia(type);
      setCallState("calling");
      socket.emit("startCall", {
        roomId: room._id,
        callerName: user?.fullName,
        callType: type,
      });
    } catch (error) {
      cleanup(false);
      showToast(getCallMediaError(error, type), "error");
    }
  };

  const acceptCall = async () => {
    try {
      const type = incoming.callType === "video" ? "video" : "voice";
      setCallType(type);
      callTypeRef.current = type;
      await getMedia(type);
      setCallState("connecting");
      socket.emit("acceptCall", {
        callerId: incoming.callerId,
        roomId: incoming.roomId,
      });
      setIncoming(null);
    } catch {
      showToast("Bạn cần cấp quyền camera/microphone phù hợp", "error");
    }
  };

  // Socket listeners được đăng ký lại theo phòng và trạng thái hiện tại.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onIncoming = (data) => {
      if (
        String(data.roomId) === String(room?._id) &&
        callState === "idle"
      ) {
        setIncoming(data);
      }
    };

    const onAccepted = async ({ peerId }) => {
      const peer = await createPeer(peerId, callTypeRef.current);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtcOffer", {
        targetId: peerId,
        offer,
      });
    };

    const onOffer = async ({ peerId, offer }) => {
      const peer = await createPeer(peerId, callTypeRef.current);
      await peer.setRemoteDescription(offer);
      await addPendingIceCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtcAnswer", {
        targetId: peerId,
        answer,
      });
    };

    const onAnswer = async ({ answer }) => {
      const peer = peerRef.current;

      if (!peer) return;

      await peer.setRemoteDescription(answer);
      await addPendingIceCandidates(peer);
    };

    const onIce = async ({ candidate }) => {
      try {
        const peer = peerRef.current;

        if (!peer?.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.error("Không thể thêm ICE candidate:", error);
      }
    };

    const onCallError = ({ message }) => {
      cleanup(false);
      showToast(message || "Không thể thực hiện cuộc gọi", "error");
    };

    const onEnded = () => {
      cleanup(false);
      showToast("Cuộc gọi đã kết thúc", "warning");
    };

    socket.on("incomingCall", onIncoming);
    socket.on("callAccepted", onAccepted);
    socket.on("webrtcOffer", onOffer);
    socket.on("webrtcAnswer", onAnswer);
    socket.on("iceCandidate", onIce);
    socket.on("callEnded", onEnded);
    socket.on("callError", onCallError);

    return () => {
      socket.off("incomingCall", onIncoming);
      socket.off("callAccepted", onAccepted);
      socket.off("webrtcOffer", onOffer);
      socket.off("webrtcAnswer", onAnswer);
      socket.off("iceCandidate", onIce);
      socket.off("callEnded", onEnded);
      socket.off("callError", onCallError);
    };
  }, [room?._id, callState, callType]);

  useEffect(() => {
    if (
      callType === "video" &&
      localVideoRef.current &&
      streamRef.current
    ) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [callState, callType]);

  // Chỉ dọn microphone khi component bị tháo.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => cleanup(false), []);

  return (
    <>
      <button
        type="button"
        className="call-button voice-call-button"
        disabled={disabled || !room}
        onClick={() => startCall("voice")}
      >
        Gọi thoại
      </button>

      <button
        type="button"
        className="call-button video-call-button"
        disabled={disabled || !room}
        onClick={() => startCall("video")}
      >
        Gọi video
      </button>

      {incoming && (
        <div className="incoming-call">
          <strong>
            {incoming.callerName} đang gọi
            {incoming.callType === "video" ? " video" : " thoại"}…
          </strong>
          <button onClick={acceptCall}>Trả lời</button>
          <button className="danger" onClick={() => setIncoming(null)}>
            Từ chối
          </button>
        </div>
      )}

      {callState !== "idle" && (
        <div className="call-backdrop">
          <section className="call-modal">
            <h3>
              {callState === "calling"
                ? "Đang gọi các thành viên…"
                : callState === "active"
                  ? "Đang trong cuộc gọi"
                  : "Đang kết nối…"}
            </h3>

            {callType === "video" ? (
              <div className="video-call-stage">
                <video ref={remoteVideoRef} autoPlay playsInline />
                <video
                  className="local-video"
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            ) : (
              <div className="audio-call-status">
                <div className="audio-call-avatar">
                  {room?.name?.charAt(0).toUpperCase() || "P"}
                </div>

                <p>{room?.name}</p>
                <span>
                  {muted
                    ? "Microphone đang tắt"
                    : "Microphone đang bật"}
                </span>
              </div>
            )}

            <audio ref={remoteAudioRef} autoPlay />

            <div className="call-controls">
              <button
                onClick={() => {
                  const next = !muted;
                  streamRef.current?.getAudioTracks().forEach((track) => {
                    track.enabled = !next;
                  });
                  setMuted(next);
                }}
              >
                {muted ? "Bật mic" : "Tắt mic"}
              </button>

              {callType === "video" && (
                <button
                  onClick={() => {
                    const next = !cameraOff;
                    streamRef.current?.getVideoTracks().forEach((track) => {
                      track.enabled = !next;
                    });
                    setCameraOff(next);
                  }}
                >
                  {cameraOff ? "Bật camera" : "Tắt camera"}
                </button>
              )}

              <button className="danger" onClick={() => cleanup(true)}>
                Kết thúc
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
