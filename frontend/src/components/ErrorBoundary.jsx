import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Cập nhật state để hiển thị UI thay thế
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Bạn có thể gửi lỗi này đến các dịch vụ như Sentry hoặc LogRocket
        console.error("Lỗi đấu giá:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Giao diện khi bị lỗi (thiết kế theo phong cách Dark Mode của bạn)
            return (
                <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 text-center">
                    <div className="max-w-md p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl">
                        <h2 className="text-3xl font-black italic text-red-500 uppercase mb-4">Đã xảy ra lỗi!</h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            Không thể tải thông tin vật phẩm này. Có thể dữ liệu từ blockchain đang bị gián đoạn.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-cyan-500 text-black font-black rounded-full uppercase italic hover:bg-white transition-all"
                        >
                            Thử tải lại trang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;