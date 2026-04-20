import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfigProvider, App as AntdApp } from "antd";

const antdTheme = {
  token: {
    colorPrimary: "#027BFF",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#EBEBEB",
    colorBorder: "#EFEEF5",
    borderRadius: 8,
    fontFamily: "Inter, sans-serif",
  },
  components: {
    Button: {
      colorPrimary: "#027BFF",
      algorithm: true,
    },
    Input: {
      colorBorder: "#EFEEF5",
      borderRadius: 8,
    },
    Select: {
      colorBorder: "#EFEEF5",
      borderRadius: 8,
    },
  },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme}>
        <AntdApp>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
