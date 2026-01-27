import React from 'react';

export const TestPage = () => {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Test Page Works!</h1>
      <p>If you can see this, React Router is working correctly.</p>
      <p>Current URL: {window.location.href}</p>
      <a href="/login">Go to Login</a>
    </div>
  );
};
