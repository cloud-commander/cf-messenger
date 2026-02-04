import { playSound } from "./utils/audio";
import { useChatStore } from "./store/useChatStore";
import { LoginScreen } from "./components/auth/LoginScreen";
import { DraggableWindow } from "./components/layout/DraggableWindow";
import { ChatWindow } from "./components/chat/ChatWindow";

export default function TestApp() {
  console.log("TestApp rendering", playSound);
  const currentUser = useChatStore((state) => state.currentUser);
  return (
    <div>
      <div>Test App Works (User: {currentUser?.id ?? "None"})</div>
      <DraggableWindow
        windowId="login"
        /* title="Login" - not supported */
        /* Events not supported in props directly */
      >
        <LoginScreen
          onLogin={(user) => {
            console.log(user);
          }}
        />
      </DraggableWindow>
      <DraggableWindow
        windowId="chat"
        /* title="Chat" */
      >
        <ChatWindow
          windowId="dm_user1__user2"
          onClose={() => {
            /* no-op */
          }}
        />
      </DraggableWindow>
    </div>
  );
}
