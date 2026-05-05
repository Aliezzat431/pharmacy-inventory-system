"use client";

import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6 dark:from-[#0f0f0f] dark:to-[#1a1a1a]">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-[#161616]">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
              حدث خطأ غير متوقع
            </h1>

            <p className="mb-6 text-sm leading-6 text-gray-600 dark:text-gray-400">
              حدثت مشكلة أثناء تشغيل النظام.
              يمكنك إعادة تحميل الصفحة والمحاولة مرة أخرى.
            </p>

            {process.env.NODE_ENV === "development" &&
              this.state.error?.message && (
                <div className="mb-6 rounded-lg bg-gray-100 p-3 text-left text-xs text-red-500 dark:bg-[#222]">
                  {this.state.error.message}
                </div>
              )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}