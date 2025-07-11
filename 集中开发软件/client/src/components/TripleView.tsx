import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import FrontendEditor from './FrontendEditor';
import BackendEditor from './BackendEditor';
import PreviewWindow from './PreviewWindow';
import CollaborationIndicator from './CollaborationIndicator';
import { socket } from '../services/socketService';
import toast from 'react-hot-toast';

interface TripleViewProps {
  className?: string;
}

const TripleView: React.FC<TripleViewProps> = ({ className = '' }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();
  
  const [frontendCode, setFrontendCode] = useState('');
  const [backendCode, setBackendCode] = useState('');
  const [mockData, setMockData] = useState({});
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!projectId || !user) return;

    // 连接Socket.IO
    socketRef.current = socket;
    
    // 加入项目房间
    socket.emit('join-project', {
      projectId,
      userId: user.id,
      username: user.username
    });

    // 监听连接状态
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('已连接到服务器');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('与服务器断开连接');
    });

    // 监听项目状态
    socket.on('project-state', (data) => {
      setActiveUsers(data.users || []);
      console.log('项目状态更新:', data);
    });

    // 监听用户加入
    socket.on('user-joined', (data) => {
      setActiveUsers(prev => [...prev, data]);
      toast.success(`${data.username} 加入了项目`);
    });

    // 监听用户离开
    socket.on('user-left', (data) => {
      setActiveUsers(prev => prev.filter(u => u.socketId !== data.socketId));
      toast.success(`${data.username} 离开了项目`);
    });

    // 监听代码更新
    socket.on('code-updated', (data) => {
      if (data.documentId === 'frontend') {
        setFrontendCode(data.content);
      } else if (data.documentId === 'backend') {
        setBackendCode(data.content);
      }
    });

    // 监听预览更新
    socket.on('preview-changed', (data) => {
      setFrontendCode(data.frontendCode);
      setBackendCode(data.backendCode);
      setMockData(data.mockData);
    });

    // 监听部署更新
    socket.on('deployment-update', (data) => {
      toast.success(`部署状态: ${data.status}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('project-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('code-updated');
      socket.off('preview-changed');
      socket.off('deployment-update');
    };
  }, [projectId, user]);

  // 处理前端代码变更
  const handleFrontendChange = (code: string) => {
    setFrontendCode(code);
    
    // 发送代码更新到服务器
    if (socketRef.current && projectId) {
      socketRef.current.emit('code-edit', {
        projectId,
        documentId: 'frontend',
        operation: code,
        version: Date.now(),
        userId: user?.id
      });
    }
  };

  // 处理后端代码变更
  const handleBackendChange = (code: string) => {
    setBackendCode(code);
    
    // 发送代码更新到服务器
    if (socketRef.current && projectId) {
      socketRef.current.emit('code-edit', {
        projectId,
        documentId: 'backend',
        operation: code,
        version: Date.now(),
        userId: user?.id
      });
    }
  };

  // 处理预览更新
  const handlePreviewUpdate = () => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('preview-update', {
        projectId,
        frontendCode,
        backendCode,
        mockData
      });
    }
  };

  // 处理部署请求
  const handleDeploy = (config: any) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('deploy-request', {
        projectId,
        userId: user?.id,
        deploymentConfig: config
      });
    }
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">加载项目中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`triple-view ${className}`}>
      {/* 前端编辑器 */}
      <div className="editor-container">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">前端编辑器</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">React/TypeScript</span>
          </div>
        </div>
        <FrontendEditor
          code={frontendCode}
          onChange={handleFrontendChange}
          onSave={() => {
            // 保存前端代码
            toast.success('前端代码已保存');
          }}
        />
      </div>

      {/* 后端编辑器 */}
      <div className="editor-container">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">后端编辑器</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Node.js/Express</span>
          </div>
        </div>
        <BackendEditor
          code={backendCode}
          onChange={handleBackendChange}
          onSave={() => {
            // 保存后端代码
            toast.success('后端代码已保存');
          }}
        />
      </div>

      {/* 实时预览窗口 */}
      <div className="preview-window">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">实时预览</h3>
          <div className="flex items-center space-x-2">
            <CollaborationIndicator 
              users={activeUsers}
              isConnected={isConnected}
            />
            <button
              onClick={handlePreviewUpdate}
              className="btn btn-primary text-sm"
            >
              刷新预览
            </button>
            <button
              onClick={() => handleDeploy({
                platform: 'local',
                buildFrontend: true,
                buildBackend: true
              })}
              className="btn btn-secondary text-sm"
            >
              部署
            </button>
          </div>
        </div>
        <PreviewWindow
          frontendCode={frontendCode}
          backendCode={backendCode}
          mockData={mockData}
        />
      </div>
    </div>
  );
};

export default TripleView; 