import { io, Socket } from 'socket.io-client';

// 创建Socket.IO连接
export const socket: Socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  timeout: 20000,
});

// Socket事件监听器
socket.on('connect', () => {
  console.log('🔌 已连接到服务器');
});

socket.on('disconnect', () => {
  console.log('❌ 与服务器断开连接');
});

socket.on('connect_error', (error) => {
  console.error('🔌 连接错误:', error);
});

socket.on('error', (error) => {
  console.error('🔌 Socket错误:', error);
});

// 导出Socket实例
export default socket; 