# 🎵 Sub Music 项目

## 快速开始

1. **自动化部署**
   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

2. **配置API密钥**
   ```bash
   nano configs/config.yaml
   ```

3. **启动服务**
   ```bash
   ./deploy/start.sh
   ```

4. **访问应用**
   - 前端: http://localhost:3000
   - 后端: http://localhost:8080

## 详细说明

请查看 `deploy/DEPLOYMENT.md` 获取完整的部署指南。

## 管理命令

- 启动服务: `./deploy/start.sh`
- 停止服务: `./deploy/stop.sh`
- 重启服务: `./deploy/restart.sh`
- 检查环境: `./deploy/check-env.sh`
- 查看状态: `./deploy/status.sh`
