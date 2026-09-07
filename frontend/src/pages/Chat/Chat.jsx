import { Fragment } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import ProfileModal from "../../components/ProfileModal";
import CallModal from "../../components/CallModal";
import UserAvatar from "../../components/UserAvatar";
import UserMenu from "../../components/UserMenu";
import { showToast } from "../../components/ToastContainer";
import {
  API_URL,
  EMOJIS,
  MAX_GROUP_ROOMS,
} from "./chatConstants";
import {
  formatMessageDate,
  isSameDay,
} from "./chatHelpers";
import useChat from "./useChat";
import "./Chat.css";

// Hiển thị tài khoản, tìm kiếm, tạo phòng và danh sách phòng chat.
function ChatSidebar({
  user,
  onOpenProfile,
  onLogout,
  groupRoomCount,
  showCreateRoom,
  setShowCreateRoom,
  handleCreateRoom,
  newRoomName,
  setNewRoomName,
  newRoomDescription,
  setNewRoomDescription,
  roomActionLoading,
  roomIdSearch,
  setRoomIdSearch,
  setSearchedRoom,
  setError,
  handleSearchRoom,
  loading,
  error,
  displayedRooms,
  selectedRoom,
  setSelectedRoom,
  setRoomContext,
  getRoomDisplayName,
  currentUserId,
}) {
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-header">
        <div>
          <button
            type="button"
            className="chat-brand"
            onClick={() => window.location.reload()}
            title="Tải lại trang chat"
          >
            Chat Realtime
          </button>

          <UserMenu user={user} onProfile={onOpenProfile} />
        </div>
      </div>

      <div className="room-section">
        <div className="room-title">
          <h3>Phòng chat ({groupRoomCount}/{MAX_GROUP_ROOMS})</h3>

          <button
            type="button"
            className="create-room-button"
            onClick={() => setShowCreateRoom((current) => !current)}
            disabled={groupRoomCount >= MAX_GROUP_ROOMS}
            aria-label="Tạo phòng"
            title={
              groupRoomCount >= MAX_GROUP_ROOMS
                ? `Tài khoản đã đạt giới hạn ${MAX_GROUP_ROOMS} phòng chat`
                : "Tạo phòng chat"
            }
          >
            +
          </button>
        </div>

        {showCreateRoom && (
          <form className="create-room-form" onSubmit={handleCreateRoom}>
            <input
              value={newRoomName}
              onChange={(event) => setNewRoomName(event.target.value)}
              placeholder="Tên phòng"
              maxLength={80}
              required
            />

            <textarea
              rows="3"
              value={newRoomDescription}
              onChange={(event) => setNewRoomDescription(event.target.value)}
              placeholder="Mô tả (không bắt buộc)"
              maxLength={200}
            />

            <button type="submit" disabled={roomActionLoading}>
              Tạo phòng
            </button>
          </form>
        )}

        <form className="room-search" onSubmit={handleSearchRoom}>
          <input
            type="search"
            value={roomIdSearch}
            onChange={(event) => {
              setRoomIdSearch(event.target.value);
              setSearchedRoom(null);
              setError("");
            }}
            placeholder="Nhập ID phòng hoặc tài khoản..."
            aria-label="Tìm phòng hoặc tài khoản theo ID"
          />
          <button type="submit" disabled={roomActionLoading}>
            Tìm
          </button>

          {roomIdSearch && (
            <button
              className="clear-room-search"
              type="button"
              onClick={() => {
                setRoomIdSearch("");
                setSearchedRoom(null);
                setError("");
              }}
              aria-label="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </form>

        <div className="room-list">
          {loading && (
            <div className="room-skeletons">
              {[1, 2, 3].map((item) => (
                <div className="skeleton room-skeleton" key={item} />
              ))}
            </div>
          )}

          {!loading && error && <p className="room-error">{error}</p>}

          {!loading && !error && displayedRooms.length === 0 && (
            <p>
              {roomIdSearch
                ? "Không tìm thấy phòng hoặc tài khoản."
                : "Chưa có phòng chat."}
            </p>
          )}

          {!loading &&
            !error &&
            displayedRooms.map((room) => {
              const isMember = room.members?.some(
                (member) =>
                  String(member?._id || member) === String(currentUserId)
              );

              return (
                <button
                  type="button"
                  key={room._id}
                  className={`room-item ${
                    selectedRoom?._id === room._id ? "active" : ""
                  }`}
                  onClick={() => setSelectedRoom(room)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setRoomContext({
                      room,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                >
                  <span className="room-avatar">
                    {getRoomDisplayName(room)?.charAt(0).toUpperCase() || "P"}
                  </span>

                  <span className="room-info">
                    <strong>{getRoomDisplayName(room)}</strong>
                    <small>
                      {room.isDirect
                        ? "Cuộc trò chuyện 1–1"
                        : room.description || "Chọn để trò chuyện"}
                    </small>
                    <small className={isMember ? "member-badge joined" : "member-badge"}>
                      {isMember ? "Đã tham gia" : "Chưa tham gia"}
                    </small>
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout-button"
          onClick={onLogout}
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

// Hiển thị thông tin phòng, trạng thái online và các thao tác phòng.
function ChatRoomHeader({
  selectedRoom,
  user,
  getRoomDisplayName,
  onlineMemberCount,
  onlineUserIds,
  showMembers,
  setShowMembers,
  isSelectedRoomMember,
  isSelectedRoomCreator,
  roomActionLoading,
  handleJoinRoom,
  handleLeaveRoom,
  onDeleteRoom,
}) {
  return (
    <>
      <header className="chat-header">
        <div>
          <h2>{getRoomDisplayName(selectedRoom) || "Chưa chọn phòng"}</h2>
          <p>
            {selectedRoom
              ? `${selectedRoom.members?.length || 0} thành viên • ${onlineMemberCount} đang online`
              : "Hãy chọn phòng chat"}
          </p>
        </div>

        {selectedRoom && (
          <div className="room-action-area">
            <div className="room-actions">
              <CallModal
                room={selectedRoom}
                user={user}
                disabled={!isSelectedRoomMember || roomActionLoading}
              />

              <button
                type="button"
                onClick={() => setShowMembers((current) => !current)}
              >
                Thành viên
              </button>

              {!isSelectedRoomMember && (
                <button
                  type="button"
                  className="join-room-button"
                  onClick={handleJoinRoom}
                  disabled={roomActionLoading}
                >
                  Tham gia
                </button>
              )}

              {isSelectedRoomMember &&
                !isSelectedRoomCreator &&
                !selectedRoom.isDirect && (
                  <button
                    type="button"
                    className="leave-room-button"
                    onClick={handleLeaveRoom}
                    disabled={roomActionLoading}
                  >
                    Rời phòng
                  </button>
                )}

              {isSelectedRoomCreator && (
                <button
                  type="button"
                  className="delete-room-button"
                  onClick={onDeleteRoom}
                  disabled={roomActionLoading}
                >
                  Xóa phòng
                </button>
              )}
            </div>

            <small className="header-room-id">
              Room ID: {selectedRoom._id}
            </small>
          </div>
        )}
      </header>

      {showMembers && selectedRoom && (
        <section className="members-panel">
          <strong>Danh sách thành viên</strong>
          <div>
            {selectedRoom.members?.map((member) => {
              const memberId = member?._id || member;

              return (
                <span key={memberId}>
                  {member?.fullName || "Thành viên"}
                  {onlineUserIds.includes(String(memberId))
                    ? " • online"
                    : ""}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

// Hiển thị lịch sử tin nhắn, mốc ngày, tệp và chức năng thu hồi.
function MessageList({
  loadingMessages,
  messageError,
  selectedRoom,
  messages,
  currentUserId,
  handleRevokeMessage,
  messagesEndRef,
}) {
  return (
    <section className="message-list">
      {loadingMessages && (
        <p className="message-status">Đang tải tin nhắn...</p>
      )}

      {messageError && <p className="message-error">{messageError}</p>}

      {!loadingMessages &&
        selectedRoom &&
        messages.length === 0 &&
        !messageError && (
          <div className="empty-message">
            <h3>Chưa có tin nhắn</h3>
            <p>Hãy bắt đầu cuộc trò chuyện.</p>
          </div>
        )}

      <div className="messages-container">
        {messages.map((message, messageIndex) => {
          const senderId =
            message.sender?._id || message.sender?.id || message.sender;
          const isMine = String(senderId) === String(currentUserId);
          const previousMessage = messages[messageIndex - 1];
          const showDateSeparator =
            !previousMessage ||
            !isSameDay(
              previousMessage.createdAt,
              message.createdAt
            );

          return (
            <Fragment key={message._id}>
              {showDateSeparator && (
                <div className="message-date-separator">
                  <span>{formatMessageDate(message.createdAt)}</span>
                </div>
              )}

              <div className={`message-row ${isMine ? "message-row-mine" : ""}`}>
                <div
                  className={`message-bubble ${
                    isMine ? "message-bubble-mine" : ""
                  } ${message.image ? "message-bubble-image" : ""}`}
                >
                  {!isMine && (
                    <strong className="message-sender message-sender-with-avatar">
                      <UserAvatar user={message.sender} size={25} />
                      {message.sender?.fullName || "Người dùng"}
                    </strong>
                  )}

                  {message.isRevoked ? (
                    <p className="revoked-message">
                      Tin nhắn đã được thu hồi
                    </p>
                  ) : (
                    <>
                      {message.image && (
                        <img
                          className="message-image"
                          src={`${API_URL}${message.image}`}
                          alt="Ảnh tin nhắn"
                          loading="lazy"
                        />
                      )}

                      {message.messageType === "audio" && message.fileUrl && (
                        <audio
                          className="message-audio"
                          controls
                          preload="metadata"
                          src={`${API_URL}${message.fileUrl}`}
                        />
                      )}

                      {message.messageType === "file" && message.fileUrl && (
                        <a
                          className="message-file"
                          href={`${API_URL}${message.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          download={message.fileName}
                        >
                          <span className="message-file-icon">FILE</span>
                          <span>
                            <strong>{message.fileName}</strong>
                            <small>
                              {message.fileSize
                                ? `${(message.fileSize / 1024).toFixed(1)} KB`
                                : "File đính kèm"}
                            </small>
                          </span>
                        </a>
                      )}

                      {message.content && <p>{message.content}</p>}
                    </>
                  )}

                  <small>
                    {message.createdAt
                      ? new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </small>

                  {isMine && !message.isRevoked && (
                    <button
                      type="button"
                      className="revoke-message-button"
                      onClick={() => handleRevokeMessage(message._id)}
                    >
                      Thu hồi
                    </button>
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </section>
  );
}

// Hiển thị khung soạn tin, emoji, ảnh, tệp và ghi âm voice.
function MessageComposer({
  typingUser,
  imagePreviews,
  handleRemoveImage,
  handleSendMessage,
  imageInputRef,
  handleAttachmentChange,
  isSelectedRoomMember,
  isBusy,
  recordingVoice,
  uploadingAttachment,
  handleVoiceRecording,
  showEmoji,
  setShowEmoji,
  setMessageInput,
  selectedRoom,
  messageInput,
  handleMessageInputChange,
  selectedImages,
  uploadingImage,
  sendingMessage,
}) {
  return (
    <>
      {typingUser && (
        <div className="typing-status">
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
          {typingUser.fullName} đang nhập...
        </div>
      )}

      {imagePreviews.length > 0 && (
        <div className="image-preview-wrapper">
          {imagePreviews.map((preview, index) => (
            <div className="image-preview-container" key={preview}>
              <img
                src={preview}
                alt={`Ảnh xem trước ${index + 1}`}
                className="image-preview"
              />

              <button
                type="button"
                className="remove-image-button"
                onClick={() => handleRemoveImage(index)}
                aria-label="Xóa ảnh"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,.txt,.pdf,.doc,.docx,.zip"
          onChange={handleAttachmentChange}
          className="image-file-input"
        />

        <button
          type="button"
          className="select-image-button"
          onClick={() => imageInputRef.current?.click()}
          disabled={!isSelectedRoomMember || isBusy}
          aria-label="Chọn ảnh hoặc tệp"
          title="Chọn tối đa 5 ảnh hoặc tệp nhẹ"
        >
          +
        </button>

        <button
          type="button"
          className={`voice-button ${recordingVoice ? "recording" : ""}`}
          onClick={handleVoiceRecording}
          disabled={!isSelectedRoomMember || uploadingAttachment}
          aria-label={recordingVoice ? "Dừng và gửi voice" : "Ghi âm voice"}
          title={recordingVoice ? "Nhấn để dừng và gửi" : "Gửi voice"}
        >
          {recordingVoice ? "■" : "🎤"}
        </button>

        <div className="emoji-control">
          <button
            type="button"
            className="emoji-button"
            onClick={() => setShowEmoji((current) => !current)}
            disabled={!isSelectedRoomMember || isBusy}
          >
            😊
          </button>

          {showEmoji && (
            <div className="emoji-picker">
              {EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => {
                    setMessageInput((current) => current + emoji);
                    setShowEmoji(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          className="message-input"
          placeholder={
            selectedRoom
              ? isSelectedRoomMember
                ? "Nhập tin nhắn..."
                : "Hãy tham gia phòng để trò chuyện"
              : "Hãy chọn phòng trước"
          }
          value={messageInput}
          onChange={handleMessageInputChange}
          disabled={!isSelectedRoomMember || isBusy}
        />

        <button
          type="submit"
          className="send-button"
          disabled={
            !isSelectedRoomMember ||
            isBusy ||
            (!messageInput.trim() && selectedImages.length === 0)
          }
        >
          {uploadingImage
            ? "Đang gửi ảnh..."
            : sendingMessage
              ? "Đang gửi..."
              : "Gửi"}
        </button>
      </form>
    </>
  );
}

// Hiển thị menu chuột phải để mở, sao chép ID hoặc xóa phòng.
function RoomContextMenu({
  roomContext,
  currentUserId,
  setSelectedRoom,
  setRoomContext,
  setShowDeleteConfirm,
  showToast,
}) {
  if (!roomContext) {
    return null;
  }

  const creatorId =
    roomContext.room.createdBy?._id || roomContext.room.createdBy;

  return (
    <div
      className="context-menu"
      style={{
        left: roomContext.x,
        top: roomContext.y,
      }}
    >
      <button
        onClick={() => {
          setSelectedRoom(roomContext.room);
          setRoomContext(null);
        }}
      >
        Mở phòng
      </button>

      <button
        onClick={() => {
          navigator.clipboard.writeText(roomContext.room._id);
          setRoomContext(null);
          showToast("Đã sao chép Room ID");
        }}
      >
        Sao chép Room ID
      </button>

      {String(creatorId) === String(currentUserId) && (
        <button
          className="danger-text"
          onClick={() => {
            setSelectedRoom(roomContext.room);
            setShowDeleteConfirm(true);
            setRoomContext(null);
          }}
        >
          Xóa phòng
        </button>
      )}
    </div>
  );
}

// Tổng hợp giao diện Chat và nhận toàn bộ dữ liệu từ hook useChat.
function Chat() {
  const chat = useChat();

  return (
    <div className="chat-page">
      <ChatSidebar
        user={chat.user}
        onOpenProfile={() => chat.setShowProfile(true)}
        onLogout={chat.handleLogout}
        groupRoomCount={chat.groupRoomCount}
        showCreateRoom={chat.showCreateRoom}
        setShowCreateRoom={chat.setShowCreateRoom}
        handleCreateRoom={chat.handleCreateRoom}
        newRoomName={chat.newRoomName}
        setNewRoomName={chat.setNewRoomName}
        newRoomDescription={chat.newRoomDescription}
        setNewRoomDescription={chat.setNewRoomDescription}
        roomActionLoading={chat.roomActionLoading}
        roomIdSearch={chat.roomIdSearch}
        setRoomIdSearch={chat.setRoomIdSearch}
        setSearchedRoom={chat.setSearchedRoom}
        setError={chat.setError}
        handleSearchRoom={chat.handleSearchRoom}
        loading={chat.loading}
        error={chat.error}
        displayedRooms={chat.displayedRooms}
        selectedRoom={chat.selectedRoom}
        setSelectedRoom={chat.setSelectedRoom}
        setRoomContext={chat.setRoomContext}
        getRoomDisplayName={chat.getRoomDisplayName}
        currentUserId={chat.currentUserId}
      />

      <main className="chat-main">
        <ChatRoomHeader
          selectedRoom={chat.selectedRoom}
          user={chat.user}
          getRoomDisplayName={chat.getRoomDisplayName}
          onlineMemberCount={chat.onlineMemberCount}
          onlineUserIds={chat.onlineUserIds}
          showMembers={chat.showMembers}
          setShowMembers={chat.setShowMembers}
          isSelectedRoomMember={chat.isSelectedRoomMember}
          isSelectedRoomCreator={chat.isSelectedRoomCreator}
          roomActionLoading={chat.roomActionLoading}
          handleJoinRoom={chat.handleJoinRoom}
          handleLeaveRoom={chat.handleLeaveRoom}
          onDeleteRoom={() => chat.setShowDeleteConfirm(true)}
        />

        <MessageList
          loadingMessages={chat.loadingMessages}
          messageError={chat.messageError}
          selectedRoom={chat.selectedRoom}
          messages={chat.messages}
          currentUserId={chat.currentUserId}
          handleRevokeMessage={chat.handleRevokeMessage}
          messagesEndRef={chat.messagesEndRef}
        />

        <MessageComposer
          typingUser={chat.typingUser}
          imagePreviews={chat.imagePreviews}
          handleRemoveImage={chat.handleRemoveImage}
          handleSendMessage={chat.handleSendMessage}
          imageInputRef={chat.imageInputRef}
          handleAttachmentChange={chat.handleAttachmentChange}
          isSelectedRoomMember={chat.isSelectedRoomMember}
          isBusy={chat.isBusy}
          recordingVoice={chat.recordingVoice}
          uploadingAttachment={chat.uploadingAttachment}
          handleVoiceRecording={chat.handleVoiceRecording}
          showEmoji={chat.showEmoji}
          setShowEmoji={chat.setShowEmoji}
          setMessageInput={chat.setMessageInput}
          selectedRoom={chat.selectedRoom}
          messageInput={chat.messageInput}
          handleMessageInputChange={chat.handleMessageInputChange}
          selectedImages={chat.selectedImages}
          uploadingImage={chat.uploadingImage}
          sendingMessage={chat.sendingMessage}
        />
      </main>

      <RoomContextMenu
        roomContext={chat.roomContext}
        currentUserId={chat.currentUserId}
        setSelectedRoom={chat.setSelectedRoom}
        setRoomContext={chat.setRoomContext}
        setShowDeleteConfirm={chat.setShowDeleteConfirm}
        showToast={showToast}
      />

      <ProfileModal
        open={chat.showProfile}
        user={chat.user}
        onClose={() => chat.setShowProfile(false)}
        onUserUpdated={chat.handleUserUpdated}
      />

      <ConfirmModal
        open={chat.showDeleteConfirm}
        title="Xóa phòng chat?"
        message={`Tất cả tin nhắn và ảnh trong phòng “${chat.selectedRoom?.name || ""}” sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa phòng"
        danger
        onCancel={() => chat.setShowDeleteConfirm(false)}
        onConfirm={chat.handleDeleteRoom}
      />
    </div>
  );
}

export default Chat;
