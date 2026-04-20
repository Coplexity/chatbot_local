import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import Logos from "@/components/logos/logos";

export function SignupPage() {
  const navigate = useNavigate();
  const { register, continueAsGuest } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      await register(signupData);
      navigate({ to: "/chat", search: { chatId: undefined } });
    } catch (err: any) {
      setError(err?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.");
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
          <Logos.Logo className="h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-gray-800">
            Đăng ký tài khoản
          </h1>
          <p className="text-gray-500 mt-2">
            Tạo tài khoản mới để bắt đầu
          </p>
        </div>

        <div className="bg-bg-main border border-design-border rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Họ và tên
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-design-border rounded-xl focus:outline-none focus:ring-2 focus:ring-btn-text/20 focus:border-btn-text transition"
                placeholder="Nhập họ và tên"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-design-border rounded-xl focus:outline-none focus:ring-2 focus:ring-btn-text/20 focus:border-btn-text transition"
                placeholder="Nhập email"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tên đăng nhập
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-design-border rounded-xl focus:outline-none focus:ring-2 focus:ring-btn-text/20 focus:border-btn-text transition"
                placeholder="Nhập tên đăng nhập"
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-design-border rounded-xl focus:outline-none focus:ring-2 focus:ring-btn-text/20 focus:border-btn-text transition"
                placeholder="Nhập lại mật khẩu"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-btn-bg text-btn-text font-medium py-3 px-4 rounded-xl hover:bg-btn-hover-bg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-btn-text/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{" "}
              <button
                onClick={() => navigate({ to: "/login" })}
                className="text-btn-link font-medium hover:underline cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-design-border">
            <button
              onClick={() => {
                continueAsGuest();
                navigate({ to: "/chat" });
              }}
              className="w-full py-3 px-4 text-gray-600 font-medium rounded-xl border border-design-border hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            >
              Tiếp tục mà không cần đăng nhập
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Lịch sử trò chuyện sẽ được lưu trên thiết bị của bạn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
