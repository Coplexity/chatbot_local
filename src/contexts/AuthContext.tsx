import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { App } from "antd";
import { authService } from "@/services/auth.service";
import { guestStorageService } from "@/services/guest-storage.service";
import { chatService } from "@/services/chat.service";
import { setUnauthorizedHandler } from "@/services/api";
import type { User, SignInRequest, SignUpRequest } from "@/types/api-types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (credentials: SignInRequest) => Promise<void>;
  register: (data: SignUpRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isAuthenticated = !!user;

  // Migrate guest data to user account
  const migrateGuestData = async () => {
    if (!guestStorageService.hasGuestData()) return;

    const { conversations, messages } = guestStorageService.getAllGuestData();

    // Migrate each conversation with its messages
    for (const guestConv of conversations) {
      try {
        const guestMessages = messages[guestConv.id] || [];
        if (guestMessages.length === 0) continue;

        // Find first user message to start conversation
        const firstUserMessage = guestMessages.find(m => m.role === "user");
        if (!firstUserMessage) continue;

        // Create conversation on server
        const newConv = await chatService.createConversation({
          title: guestConv.title,
        });

        // Send each message pair (we can't replay streaming, so just sync the content)
        // Note: This is a simplified migration - full conversation context is preserved
        // TODO: Create a proper migration endpoint to handle this server-side
        for (const msg of guestMessages) {
          if (msg.role === "user") {
            await chatService.sendMessage(newConv.id, { content: msg.content });
          }
        }
      } catch (error) {
        console.error("Failed to migrate guest conversation:", error);
      }
    }

    // Clear guest data after migration
    guestStorageService.clearAllGuestData();
  };

  // Fetch user on mount if token exists
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      authService.logout();
      setUser(null);
      setIsGuest(false);
      setSessionExpired(true);
      message.error({
        content: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
        duration: 0,
      });
    });

    const initAuth = async () => {
      if (authService.hasToken()) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          authService.logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [message]);

  const login = async (credentials: SignInRequest) => {
    const response = await authService.signIn(credentials);
    setUser(response.user);
    setIsGuest(false);
    setSessionExpired(false);
    // TODO: Re-enable when migration is fixed
    // migrateGuestData().catch(console.error);
  };

  const register = async (data: SignUpRequest) => {
    const response = await authService.signUp(data);
    setUser(response.user);
    setIsGuest(false);
    setSessionExpired(false);
    // TODO: Re-enable when migration is fixed
    // migrateGuestData().catch(console.error);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsGuest(false);
    setSessionExpired(false);
  };

  const refreshUser = async () => {
    if (authService.hasToken()) {
      const userData = await authService.getMe();
      setUser(userData);
    }
  };

  const continueAsGuest = () => {
    // Only allow guest mode if not authenticated
    if (!user && !authService.hasToken()) {
      setIsGuest(true);
      setSessionExpired(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isGuest,
        isLoading,
        sessionExpired,
        login,
        register,
        logout,
        refreshUser,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
