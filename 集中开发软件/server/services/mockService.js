const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MockService {
  constructor() {
    this.mockData = new Map(); // 存储项目的Mock数据
    this.schemas = new Map(); // 存储数据模式
  }

  // 生成Mock数据
  generateMockData(schema, count = 1) {
    if (Array.isArray(count)) {
      return count.map(() => this.generateSingleMockData(schema));
    }
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(this.generateSingleMockData(schema, i));
    }
    return result;
  }

  // 生成单个Mock数据
  generateSingleMockData(schema, index = 0) {
    const data = {};
    
    for (const [key, config] of Object.entries(schema)) {
      data[key] = this.generateFieldValue(config, index);
    }
    
    return data;
  }

  // 根据字段配置生成值
  generateFieldValue(config, index = 0) {
    const { type, options = {} } = config;
    
    switch (type) {
      case 'string':
        return this.generateString(options, index);
      case 'number':
        return this.generateNumber(options, index);
      case 'boolean':
        return this.generateBoolean(options);
      case 'date':
        return this.generateDate(options);
      case 'email':
        return this.generateEmail(options, index);
      case 'phone':
        return this.generatePhone();
      case 'array':
        return this.generateArray(options, index);
      case 'object':
        return this.generateObject(options, index);
      case 'enum':
        return this.generateEnum(options);
      case 'id':
        return uuidv4();
      default:
        return null;
    }
  }

  // 生成字符串
  generateString(options, index) {
    const { 
      minLength = 5, 
      maxLength = 20, 
      pattern, 
      examples = ['示例数据'] 
    } = options;
    
    if (examples && examples.length > 0) {
      return examples[index % examples.length] + (index > 0 ? ` ${index + 1}` : '');
    }
    
    if (pattern) {
      return this.generateFromPattern(pattern);
    }
    
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    return this.randomString(length);
  }

  // 生成数字
  generateNumber(options) {
    const { min = 0, max = 100, precision = 0 } = options;
    const value = Math.random() * (max - min) + min;
    return precision === 0 ? Math.floor(value) : Number(value.toFixed(precision));
  }

  // 生成布尔值
  generateBoolean(options) {
    const { probability = 0.5 } = options;
    return Math.random() < probability;
  }

  // 生成日期
  generateDate(options) {
    const { startDate, endDate } = options;
    const start = startDate ? new Date(startDate) : new Date('2020-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(time).toISOString();
  }

  // 生成邮箱
  generateEmail(options, index) {
    const { domain = 'example.com', username } = options;
    const user = username || `user${index + 1}`;
    return `${user}@${domain}`;
  }

  // 生成手机号
  generatePhone() {
    const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${suffix}`;
  }

  // 生成数组
  generateArray(options, index) {
    const { minLength = 1, maxLength = 5, itemSchema } = options;
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    
    if (!itemSchema) {
      return Array(length).fill(null).map(() => Math.random());
    }
    
    return Array(length).fill(null).map((_, i) => 
      this.generateFieldValue(itemSchema, index * length + i)
    );
  }

  // 生成对象
  generateObject(options, index) {
    const { properties } = options;
    if (!properties) return {};
    
    const result = {};
    for (const [key, schema] of Object.entries(properties)) {
      result[key] = this.generateFieldValue(schema, index);
    }
    return result;
  }

  // 生成枚举值
  generateEnum(options) {
    const { values = [] } = options;
    if (values.length === 0) return null;
    return values[Math.floor(Math.random() * values.length)];
  }

  // 从模式生成字符串
  generateFromPattern(pattern) {
    // 简单的模式匹配实现
    return pattern.replace(/\{(\w+)\}/g, (match, type) => {
      switch (type) {
        case 'name': return this.generateName();
        case 'email': return this.generateEmail({});
        case 'phone': return this.generatePhone();
        case 'date': return this.generateDate({});
        default: return match;
      }
    });
  }

  // 生成随机字符串
  randomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成姓名
  generateName() {
    const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军'];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    return surname + name;
  }

  // 设置项目Mock数据
  async setProjectMockData(projectId, schema, data = null) {
    try {
      // 保存模式到数据库
      await this.saveSchema(projectId, schema);
      
      // 生成或使用提供的Mock数据
      const mockData = data || this.generateMockData(schema, 10);
      
      this.mockData.set(projectId, mockData);
      this.schemas.set(projectId, schema);
      
      return { success: true, data: mockData };
    } catch (error) {
      console.error('设置Mock数据失败:', error);
      throw new Error(`设置Mock数据失败: ${error.message}`);
    }
  }

  // 获取项目Mock数据
  async getProjectMockData(projectId) {
    try {
      // 先从内存获取
      let data = this.mockData.get(projectId);
      let schema = this.schemas.get(projectId);
      
      // 如果内存中没有，从数据库获取
      if (!data || !schema) {
        const savedSchema = await this.getSchema(projectId);
        if (savedSchema) {
          schema = savedSchema.schema;
          data = this.generateMockData(schema, 10);
          this.mockData.set(projectId, data);
          this.schemas.set(projectId, schema);
        }
      }
      
      return { data, schema };
    } catch (error) {
      console.error('获取Mock数据失败:', error);
      throw new Error(`获取Mock数据失败: ${error.message}`);
    }
  }

  // 更新Mock数据
  async updateMockData(projectId, updates) {
    try {
      const currentData = this.mockData.get(projectId) || [];
      const schema = this.schemas.get(projectId);
      
      if (!schema) {
        throw new Error('项目模式不存在');
      }
      
      // 应用更新
      const updatedData = currentData.map((item, index) => {
        if (updates[index]) {
          return { ...item, ...updates[index] };
        }
        return item;
      });
      
      this.mockData.set(projectId, updatedData);
      
      return { success: true, data: updatedData };
    } catch (error) {
      console.error('更新Mock数据失败:', error);
      throw new Error(`更新Mock数据失败: ${error.message}`);
    }
  }

  // 保存模式到数据库
  async saveSchema(projectId, schema) {
    try {
      // 这里可以扩展为保存到数据库
      // 目前只保存在内存中
      this.schemas.set(projectId, schema);
      return { success: true };
    } catch (error) {
      console.error('保存模式失败:', error);
      throw new Error(`保存模式失败: ${error.message}`);
    }
  }

  // 从数据库获取模式
  async getSchema(projectId) {
    try {
      // 这里可以从数据库获取
      // 目前返回内存中的模式
      const schema = this.schemas.get(projectId);
      return schema ? { schema } : null;
    } catch (error) {
      console.error('获取模式失败:', error);
      throw new Error(`获取模式失败: ${error.message}`);
    }
  }

  // 生成API响应
  generateAPIResponse(endpoint, method = 'GET', params = {}) {
    const commonSchemas = {
      '/api/users': {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'id' },
            name: { type: 'string', examples: ['张三', '李四', '王五'] },
            email: { type: 'email' },
            phone: { type: 'phone' },
            avatar: { type: 'string', examples: ['https://example.com/avatar1.jpg'] },
            createdAt: { type: 'date' }
          }
        }
      },
      '/api/posts': {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'id' },
            title: { type: 'string', examples: ['文章标题1', '文章标题2'] },
            content: { type: 'string', examples: ['文章内容...'] },
            author: { type: 'string', examples: ['作者1', '作者2'] },
            publishedAt: { type: 'date' }
          }
        }
      },
      '/api/products': {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'id' },
            name: { type: 'string', examples: ['产品1', '产品2'] },
            price: { type: 'number', min: 10, max: 1000 },
            description: { type: 'string', examples: ['产品描述...'] },
            category: { type: 'enum', values: ['电子产品', '服装', '食品'] }
          }
        }
      }
    };

    const schema = commonSchemas[endpoint];
    if (!schema) {
      return { message: 'API endpoint not found' };
    }

    return this.generateMockData(schema, 5);
  }

  // 清理项目Mock数据
  async cleanupProjectMockData(projectId) {
    try {
      this.mockData.delete(projectId);
      this.schemas.delete(projectId);
      return { success: true };
    } catch (error) {
      console.error('清理Mock数据失败:', error);
      throw new Error(`清理Mock数据失败: ${error.message}`);
    }
  }
}

module.exports = new MockService(); 