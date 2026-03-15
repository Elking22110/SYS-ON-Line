import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', color: '#333' }} dir="rtl">
          <h2 style={{ color: '#d32f2f' }}>عذراً، حدث خطأ غير متوقع في هذا المكون! ⚠️</h2>
          <p>لقد قمنا باحتواء الخطأ حتى لا يتوقف النظام بالكامل. يرجى إعادة تحميل الصفحة.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '10px 20px', 
              background: '#5235E8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginTop: '10px'
            }}
          >
            إعادة تحميل الصفحة
          </button>
          
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px', textAlign: 'left' }} dir="ltr">
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>تفاصيل الخطأ (للمطورين)</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
