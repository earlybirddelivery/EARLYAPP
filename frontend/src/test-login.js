import axios from 'axios';

const testLogin = async () => {
  try {
    console.log('Testing login...');
    const response = await axios.post('http://localhost:9885/api/auth/login', {
      email: 'admin@earlybird.com',
      password: 'admin123'
    });
    console.log('✓ Login successful:', response.data);
  } catch (error) {
    console.error('✗ Login error:', error.response?.data || error.message);
  }
};

testLogin();
