import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import Logos from "@/components/logos/logos";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, continueAsGuest } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(formData);
      navigate({ to: "/chat" });
    } catch (err) {
      const message = err instanceof ApiError ? err.data?.message : undefined;
      setError(message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-[#00C999] w-32 h-32 flex items-center justify-center rounded-full mx-auto mb-4">
          <Logos.Logo className="size-24" />

          </div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Đăng nhập
          </h1>
          <p className="text-gray-500 mt-2">
            Medibot
          </p>
        </div>

        <div className="bg-bg-main border border-design-border rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email hoặc tên đăng nhập
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-design-border rounded-xl focus:outline-none focus:ring-2 focus:ring-btn-text/20 focus:border-btn-text transition"
                placeholder="Nhập email hoặc tên đăng nhập"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-design-border rounded-xl focus:outline-none focus:ring-2 focus:ring-btn-text/20 focus:border-btn-text transition"
                placeholder="Nhập mật khẩu"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-btn-bg text-btn-text font-medium py-3 px-4 rounded-xl hover:bg-btn-hover-bg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-btn-text/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => navigate({ to: "/signup" })}
                className="text-btn-link font-medium hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-design-border">
            <button
              type="button"
              onClick={() => {
                continueAsGuest();
                navigate({ to: "/chat" });
              }}
              className="w-full py-3 px-4 text-gray-600 font-medium rounded-xl border border-design-border hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            >
              Khách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
