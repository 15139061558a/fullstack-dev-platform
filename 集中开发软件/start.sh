#!/bin/bash

echo "🚀 启动集成开发平台..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，请安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本检查通过"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 检查通过"

# 安装依赖
echo "📦 安装后端依赖..."
npm install

echo "📦 安装前端依赖..."
cd client && npm install && cd ..

# 初始化数据库
echo "🗄️ 初始化数据库..."
npx prisma generate
npx prisma db push

# 创建环境文件
if [ ! -f .env ]; then
    echo "📝 创建环境配置文件..."
    cp env.example .env
    echo "✅ 环境配置文件已创建，请根据需要修改 .env 文件"
fi

echo "🎉 安装完成！"
echo ""
echo "启动开发服务器："
echo "  npm run dev"
echo ""
echo "或者使用 Docker："
echo "  docker-compose up"
echo ""
echo "访问地址："
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:5000"
echo "" 