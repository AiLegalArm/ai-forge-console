import { useMemo, useReducer } from "react";
import { activeAgents, initialChatState } from "@/data/mock-chat";
import type { ChatState, ChatType } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";

type Action =
  | { type: "set_active_chat_type"; chatType: ChatType }
  | { type: "select_session"; chatType: ChatType; sessionId: string }
  | { type: "update_draft"; sessionId: string; value: string }
  | { type: "clear_approval"; sessionId: string };

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "set_active_chat_type": {
      return { ...state, activeChatType: action.chatType };
    }
    case "select_session": {
      return {
        ...state,
        selectedSessionIdByType: {
          ...state.selectedSessionIdByType,
          [action.chatType]: action.sessionId,
        },
      };
    }
    case "update_draft": {
      return {
        ...state,
        draftInputBySessionId: {
          ...state.draftInputBySessionId,
          [action.sessionId]: action.value,
        },
      };
    }
    case "clear_approval": {
      return {
        ...state,
        approvalRequestBySessionId: {
          ...state.approvalRequestBySessionId,
          [action.sessionId]: null,
        },
      };
    }
    default:
      return state;
  }
}

export function useChatWorkspaceState() {
  const [chatState, dispatch] = useReducer(reducer, initialChatState);

  const currentChatType = chatState.activeChatType;
  const currentChatSessionId = chatState.selectedSessionIdByType[currentChatType];
  const currentSession = chatState.sessions.find((session) => session.id === currentChatSessionId);

  const chatContexts = useMemo<ChatContextMap>(() => {
    const contextMap = {
      main: [],
      agent: [],
      audit: [],
      review: [],
    } as ChatContextMap;

    (Object.keys(contextMap) as ChatType[]).forEach((type) => {
      const sessionId = chatState.selectedSessionIdByType[type];
      contextMap[type] = sessionId ? (chatState.messagesBySessionId[sessionId] ?? []) : [];
    });

    return contextMap;
  }, [chatState.messagesBySessionId, chatState.selectedSessionIdByType]);

  const workspaceState: WorkspaceRuntimeState = {
    currentProject: "SaaS Dashboard",
    currentBranch: "feat/user-management",
    currentTask: currentSession?.linked.taskTitle ?? "Build user management module",
    activeProvider: currentSession?.providerMeta.provider ?? "Anthropic",
    activeBackend: currentSession?.providerMeta.backend ?? "ollama",
    privacyMode: "private",
    syncStatus: "synced",
    activeAgents,
    currentConversationType: currentChatType,
    currentChatSessionId,
  };

  return {
    chatState,
    workspaceState,
    chatContexts,
    setConversationType: (chatType: ChatType) => dispatch({ type: "set_active_chat_type", chatType }),
    setDraft: (sessionId: string, value: string) => dispatch({ type: "update_draft", sessionId, value }),
    clearApproval: (sessionId: string) => dispatch({ type: "clear_approval", sessionId }),
  };
}
